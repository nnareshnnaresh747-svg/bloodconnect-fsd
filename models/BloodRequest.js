const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema({
    requester: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    donor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    bloodGroup: {
        type: String,
        required: true
    },
    units: {
        type: Number,
        required: true,
        min: 1
    },
    hospital: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    urgency: {
        type: String,
        enum: ["Normal", "Urgent", "Critical"],
        default: "Urgent"
    },
    notes: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ["Pending", "Accepted", "Rejected", "Completed"],
        default: "Pending"
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("BloodRequest", requestSchema);