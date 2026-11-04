const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    bloodGroup: {
        type: String,
        required: true,
        enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
    },
    city: {
        type: String,
        required: true
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    role: {
        type: String,
        enum: ["donor", "recipient"],
        default: "donor"
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("User", userSchema);