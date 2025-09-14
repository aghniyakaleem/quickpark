import rateLimit from "express-rate-limit";

export const publicRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, slow down" }
});