const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
    const token = req.header("Authorization");

    if (!token || !token.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Access denied. Please login."
        });
    }

    try {
        const decoded = jwt.verify(
            token.split(" ")[1],
            process.env.JWT_SECRET
        );

        req.user = decoded;
        next();

    } catch (error) {
        res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};