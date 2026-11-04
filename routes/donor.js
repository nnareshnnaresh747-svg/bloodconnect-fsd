const express = require("express");
const router = express.Router();

const User = require("../models/User");
const auth = require("../middleware/auth");

router.get("/search", auth, async (req, res) => {
    try {
        const { bloodGroup, city } = req.query;

        if (!bloodGroup || !city) {
            return res.status(400).json({
                message: "Blood group and city are required"
            });
        }

        const donors = await User.find({
            bloodGroup,
            city: {
                $regex: city,
                $options: "i"
            },
            role: "donor",
            isAvailable: true,
            _id: { $ne: req.user.id }
        }).select("name bloodGroup city isAvailable");

        res.json({
            count: donors.length,
            donors
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

router.put("/availability", auth, async (req, res) => {
    try {
        if (typeof req.body.isAvailable !== "boolean") {
            return res.status(400).json({
                message: "Provide a valid availability status"
            });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { isAvailable: req.body.isAvailable },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.json({
            message: "Availability updated",
            isAvailable: user.isAvailable
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

module.exports = router;