const express = require("express");
const router = express.Router();

const BloodRequest = require("../models/BloodRequest");
const User = require("../models/User");
const auth = require("../middleware/auth");

router.post("/create", auth, async (req, res) => {
    try {
        const {
            donorId,
            bloodGroup,
            units,
            hospital,
            city,
            urgency,
            notes
        } = req.body;

        if (!donorId || !bloodGroup || !units ||
            !hospital || !city) {
            return res.status(400).json({
                message: "Please fill all required fields"
            });
        }

        if (!Number.isInteger(Number(units)) ||
            Number(units) < 1 || Number(units) > 10) {
            return res.status(400).json({
                message: "Enter a valid number of units"
            });
        }

        const donor = await User.findOne({
            _id: donorId,
            role: "donor",
            isAvailable: true,
            bloodGroup
        });

        if (!donor || donor._id.toString() === req.user.id) {
            return res.status(404).json({
                message: "Available donor not found"
            });
        }

        const request = await BloodRequest.create({
            requester: req.user.id,
            donor: donorId,
            bloodGroup,
            units,
            hospital,
            city,
            urgency,
            notes
        });

        res.status(201).json({
            message: "Blood request sent successfully",
            request
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

router.get("/incoming", auth, async (req, res) => {
    try {
        const requests = await BloodRequest.find({
            donor: req.user.id
        })
        .populate("requester", "name phone city")
        .sort({ createdAt: -1 });

        res.json(requests);

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

router.get("/outgoing", auth, async (req, res) => {
    try {
        const requests = await BloodRequest.find({
            requester: req.user.id
        })
        .populate("donor", "name city bloodGroup")
        .sort({ createdAt: -1 });

        res.json(requests);

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

router.put("/:id/status", auth, async (req, res) => {
    try {
        const { status } = req.body;

        if (!["Accepted", "Rejected", "Completed"].includes(status)) {
            return res.status(400).json({
                message: "Invalid status"
            });
        }

        const request = await BloodRequest.findOne({
            _id: req.params.id,
            donor: req.user.id
        });

        if (!request) {
            return res.status(404).json({
                message: "Request not found"
            });
        }

        if (request.status !== "Pending") {
            return res.status(400).json({
                message: "This request has already been processed"
            });
        }

        if (status === "Completed") {
            return res.status(400).json({
                message: "Only accepted requests can be completed"
            });
        }

        request.status = status;
        await request.save();

        res.json({
            message: "Request status updated",
            request
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

module.exports = router;