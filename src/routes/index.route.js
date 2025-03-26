/**
 * Konfigurasi rute utama aplikasi
 */
import express from "express";
import authRoutes from "./auth.route.js";
import userRoutes from "./user.route.js";
import adminRoutes from "./admin.route.js";
import mfaRoutes from "./mfa.route.js";
import roleRoutes from "./role.route.js";
import permissionRoutes from "./permission.route.js";
import userRoleRoutes from "./user-role.route.js";
import diagnosticsRoutes from "./diagnostics.route.js";
import consumerKeyRoutes from "./consumer-key.route.js";
import userActivityRoutes from "./user-activity.route.js";
import {
  notFoundHandler,
  errorHandler,
} from "../middlewares/error.middleware.js";

const router = express.Router();

/**
 * Rute untuk health check dasar
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    code: "SUCCESS",
    message: "Service is running",
    data: {
      status: "UP",
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * API versioning
 */
router.use("/api/v1/auth", authRoutes);
router.use("/api/v1/users", userRoutes);
router.use("/api/v1/admin", adminRoutes);
router.use("/api/v1/mfa", mfaRoutes);

// Role & Permission routes
router.use("/api/v1/admin/roles", roleRoutes);
router.use("/api/v1/admin/permissions", permissionRoutes);
router.use("/api/v1/admin/users", userRoleRoutes);

// Diagnostics routes
router.use("/", diagnosticsRoutes);

// Consumer Key routes
router.use("/api/v1/consumers", consumerKeyRoutes);

// User Activity routes
router.use("/api/v1/users", userActivityRoutes);

/**
 * Middleware untuk 404 dan error handling
 */
router.use(notFoundHandler);
router.use(errorHandler);

export default router;
