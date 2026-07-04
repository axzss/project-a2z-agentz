import sys
import os
import re
from starlette.routing import Route
from starlette.responses import JSONResponse
from starlette.requests import Request

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
import database

# Also add backend directory so we can import auth module
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from auth import hash_password, verify_password, create_access_token, verify_access_token

def validate_email(email):
    return re.match(r"[^@]+@[^@]+\.[^@]+", email)

async def register(request: Request):
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)
    
    email = data.get("email")
    password = data.get("password")
    wallet_address = data.get("wallet_address")

    if not email or not validate_email(email):
        return JSONResponse({"error": "Invalid email format"}, status_code=422)
    
    if not password or len(password) < 8:
        return JSONResponse({"error": "Password must be at least 8 characters"}, status_code=422)
    
    # Check if email exists
    existing_user = database.get_user_by_email(email)
    if existing_user:
        return JSONResponse({"error": "Email already registered"}, status_code=409)
    
    # Hash password
    hashed_pwd = hash_password(password)

    # Insert user
    user = database.create_user(email, hashed_pwd, wallet_address)
    if not user:
        return JSONResponse({"error": "Failed to create user"}, status_code=500)
    
    # Remove password_hash before returning
    user.pop("password_hash", None)

    return JSONResponse({"user": user}, status_code=201)

async def login(request: Request):
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)
    
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return JSONResponse({"error": "Email and password required"}, status_code=400)
    
    user = database.get_user_by_email(email)
    if not user:
        return JSONResponse({"error": "Invalid email or password"}, status_code=401)
    
    if not verify_password(password, user["password_hash"]):
        return JSONResponse({"error": "Invalid email or password"}, status_code=401)
    
    # Update last login
    database.update_last_login(user["id"])
    user["last_login_at"] = database.get_user_by_id(user["id"])["last_login_at"] # Refresh

    # Generate token
    token = create_access_token({"sub": str(user["id"]), "email": user["email"]})

    # Prepare response
    user.pop("password_hash", None)
    response = JSONResponse({"user": user})

    # Set cookie
    response.set_cookie(
        key="a2z-token",
        value=token,
        httponly=True,
        path="/",
        max_age=604800, # 7 days
        samesite="lax",
        secure=False # Set to True if HTTPS
    )

    return response

async def me(request: Request):
    token = request.cookies.get("a2z-token")
    if not token:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    
    payload = verify_access_token(token)
    if not payload or "sub" not in payload:
        return JSONResponse({"error": "Invalid or expired token"}, status_code=401)
    
    user_id = int(payload["sub"])
    user = database.get_user_by_id(user_id)
    if not user:
        return JSONResponse({"error": "User not found"}, status_code=401)
    
    return JSONResponse({"user": user})

async def logout(request: Request):
    response = JSONResponse({"ok": True})
    response.set_cookie(
        key="a2z-token",
        value="",
        httponly=True,
        path="/",
        max_age=0,
        samesite="lax",
        secure=False
    )
    return response

import uuid
from eth_account import Account
from eth_account.messages import encode_defunct
from agent_a import normalize_address

async def wallet_nonce(request: Request):
    nonce = os.urandom(16).hex()
    response = JSONResponse({"nonce": nonce})
    response.set_cookie(
        key="a2z-wallet-nonce",
        value=nonce,
        httponly=True,
        path="/",
        max_age=300, # 5 minutes
        samesite="lax",
        secure=False
    )
    return response

async def wallet_verify(request: Request):
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)
    
    address = data.get("address")
    signature = data.get("signature")
    
    if not address or not signature:
        return JSONResponse({"error": "Address and signature are required"}, status_code=400)
        
    nonce = request.cookies.get("a2z-wallet-nonce")
    if not nonce:
        return JSONResponse({"error": "Nonce expired or not requested. Please try again."}, status_code=400)
        
    checksum_address = normalize_address(address)
    if not checksum_address:
        return JSONResponse({"error": "Invalid Ethereum address format"}, status_code=400)
        
    # Standard SIWE message format or plain nonce format
    message_text_siwe = f"Sign in to A2Z Agentz\nAddress: {checksum_address}\nNonce: {nonce}"
    message_text_plain = nonce
    
    recovered_address = None
    
    # Try SIWE message first
    try:
        msg = encode_defunct(text=message_text_siwe)
        recovered_address = Account.recover_message(msg, signature=signature)
    except Exception:
        pass
        
    # If failed, try plain nonce message
    if not recovered_address or recovered_address.lower() != checksum_address.lower():
        try:
            msg = encode_defunct(text=message_text_plain)
            recovered_address = Account.recover_message(msg, signature=signature)
        except Exception:
            pass
            
    if not recovered_address or recovered_address.lower() != checksum_address.lower():
        return JSONResponse({"error": "Signature verification failed. Invalid signer address."}, status_code=401)
        
    # Signature is valid! Get or create user
    user = database.get_user_by_wallet(checksum_address)
    if not user:
        # Create shadow user
        email = f"wallet-{checksum_address.lower()}@a2z.internal"
        existing_email_user = database.get_user_by_email(email)
        if existing_email_user:
            user = existing_email_user
        else:
            hashed_pwd = hash_password(str(uuid.uuid4()))
            user = database.create_user(email, hashed_pwd, checksum_address)
            if not user:
                return JSONResponse({"error": "Failed to create user session"}, status_code=500)
                
    # Update login timestamp
    database.update_last_login(user["id"])
    user["last_login_at"] = database.get_user_by_id(user["id"])["last_login_at"] # Refresh
    
    # Create token session
    token = create_access_token({"sub": str(user["id"]), "email": user["email"]})
    
    user.pop("password_hash", None)
    response = JSONResponse({"user": user})
    
    # Set login cookie
    response.set_cookie(
        key="a2z-token",
        value=token,
        httponly=True,
        path="/",
        max_age=604800, # 7 days
        samesite="lax",
        secure=False
    )
    
    # Clear the temporary nonce cookie
    response.set_cookie(
        key="a2z-wallet-nonce",
        value="",
        httponly=True,
        path="/",
        max_age=0,
        samesite="lax",
        secure=False
    )
    
    return response

routes = [
    Route("/register", register, methods=["POST"]),
    Route("/login", login, methods=["POST"]),
    Route("/me", me, methods=["GET"]),
    Route("/logout", logout, methods=["POST"]),
    Route("/wallet/nonce", wallet_nonce, methods=["GET"]),
    Route("/wallet/verify", wallet_verify, methods=["POST"])
]
