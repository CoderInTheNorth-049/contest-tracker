const mongoose = require('mongoose');

mongoose.connect("mongodb+srv://admin:arif049@cluster0.tfqnzyt.mongodb.net/contest-tracker");

const userSchema = new mongoose.Schema({
    codeforcesId: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    contests: [{
        contestId: Number,
        rank: Number,
        totalParticipants: Number,
        oldRating: Number,
        newRating: Number,
        ratingChanged: Number
    }],

    highestRating: {
        type: Number,
        default: 0
    }

});

const contestAverageRatingSchema = new mongoose.Schema({
    contestId: {
        type: Number,
        required: true,
        unique: true
    },
    contestName: {
        type: String,
        required: true
    },
    averageRating: {
        type: Number,
        required: true
    }
});

const User = mongoose.model('User', userSchema);
const ContestRating = mongoose.model('ContestRating', contestAverageRatingSchema);

module.exports ={
    User,
    ContestRating
};
