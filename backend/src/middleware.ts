import { NextFunction, Request, Response } from "express";
import { JWT_SECRET, WORKER_JWT_SECRET } from "./config";
import jwt from "jsonwebtoken";

// Extend Express Request type with detailed user information
interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
}

// Enhanced auth middleware with detailed error handling
export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  // Debug: Log incoming headers for troubleshooting
  console.log('[Auth Middleware] Incoming headers:', req.headers);

  const authHeader = req.headers["authorization"] || req.headers["Authorization"];

  if (!authHeader) {
    console.warn('[Auth Middleware] No authorization header found');
    return res.status(401).json({ 
      message: "Authentication required",
      error: "MISSING_AUTH_HEADER",
      solution: "Include 'Authorization: Bearer <token>' header"
    });
  }

  if (typeof authHeader !== 'string' || !authHeader.startsWith("Bearer ")) {
    console.warn('[Auth Middleware] Malformed authorization header:', authHeader);
    return res.status(401).json({
      message: "Invalid authorization format",
      error: "INVALID_AUTH_FORMAT",
      solution: "Use format: 'Bearer <your_jwt_token>'"
    });
  }

  const token = authHeader.split(" ")[1].trim(); // Extract and clean token

  if (!token) {
    console.warn('[Auth Middleware] Empty token provided');
    return res.status(401).json({
      message: "No token provided",
      error: "EMPTY_TOKEN"
    });
  }

  try {
    // Verify with 5-minute clock tolerance for clock skew
    const decoded = jwt.verify(token, JWT_SECRET, { clockTolerance: 300 }) as jwt.JwtPayload;

    if (typeof decoded !== "object" || !decoded.userId) {
      console.warn('[Auth Middleware] Invalid token payload:', decoded);
      return res.status(403).json({
        message: "Invalid token payload",
        error: "INVALID_TOKEN_PAYLOAD",
        required: "Must contain 'userId'"
      });
    }

    // Attach user information to request
    req.userId = decoded.userId;
    req.userRole = decoded.role; // Optional: if you include roles in your JWT

    console.log(`[Auth Middleware] Authenticated user ${decoded.userId}`);
    return next();
    
  } catch (e) {
    console.error('[Auth Middleware] JWT Verification Error:', e);

    if (e instanceof jwt.TokenExpiredError) {
      return res.status(403).json({
        message: "Session expired",
        error: "TOKEN_EXPIRED",
        solution: "Please login again"
      });
    }

    if (e instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({
        message: "Invalid token",
        error: "INVALID_TOKEN",
        solution: "Check your token or request a new one"
      });
    }

    return res.status(500).json({
      message: "Authentication failed",
      error: "AUTHENTICATION_FAILURE"
    });
  }
}

// Enhanced worker middleware with similar improvements
export function workerMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  console.log('[Worker Middleware] Incoming headers:', req.headers);

  const authHeader = req.headers["authorization"] || req.headers["Authorization"];

  if (!authHeader) {
    console.warn('[Worker Middleware] No authorization header found');
    return res.status(401).json({
      message: "Worker authentication required",
      error: "MISSING_WORKER_AUTH_HEADER"
    });
  }

  if (typeof authHeader !== 'string' || !authHeader.startsWith("Bearer ")) {
    console.warn('[Worker Middleware] Malformed authorization header:', authHeader);
    return res.status(401).json({
      message: "Invalid worker authorization format",
      error: "INVALID_WORKER_AUTH_FORMAT"
    });
  }

  const token = authHeader.split(" ")[1].trim();

  try {
    const decoded = jwt.verify(token, WORKER_JWT_SECRET, { clockTolerance: 300 }) as jwt.JwtPayload;

    if (typeof decoded !== "object" || !decoded.userId) {
      console.warn('[Worker Middleware] Invalid worker token payload:', decoded);
      return res.status(403).json({
        message: "Invalid worker token",
        error: "INVALID_WORKER_TOKEN"
      });
    }

    req.userId = decoded.userId;
    console.log(`[Worker Middleware] Authenticated worker ${decoded.userId}`);
    return next();

  } catch (e) {
    console.error('[Worker Middleware] JWT Verification Error:', e);

    if (e instanceof jwt.TokenExpiredError) {
      return res.status(403).json({
        message: "Worker session expired",
        error: "WORKER_TOKEN_EXPIRED"
      });
    }

    return res.status(403).json({
      message: "Invalid worker credentials",
      error: "INVALID_WORKER_CREDENTIALS"
    });
  }
}

// Optional: Add request logging middleware
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
}