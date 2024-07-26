const express = require("express");
const zod = require("zod");
const axios = require("axios");
const { User, ContestRating } = require("../db");
const { authmidddleware } = require("../middleware");

const router = express.Router();

const contestSchema = zod.object({
  codeforcesId: zod.string(),
  contestId: zod.number()
});

router.post("/add", authmidddleware, async (req, res) => {
  try {
    const validatedData = contestSchema.safeParse(req.body);
    if (!validatedData.success) {
      return res.status(411).json({
        message: "Invalid Inputs",
        errors: validatedData.error.errors
      });
    }
    const { codeforcesId, contestId } = req.body;

    const user = await User.findOne({ codeforcesId });
    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const contestExists = user.contests.some(c => c.contestId === contestId);

    if(contestExists){
        return res.status(400).json({
            message: "User already attempted that contest"
        })
    }

    // Fetch both official and unofficial standings
    const contestUnofficialData = await axios.get(`https://codeforces.com/api/contest.standings?contestId=${contestId}&showUnofficial=true`);
    const contestOfficialData = await axios.get(`https://codeforces.com/api/contest.standings?contestId=${contestId}`);
    
    // invalid contesID
    if(contestOfficialData.data.status === "FAILED"){
      return res.status(400).json({
        message: "Contest not found"
      })
    }
    const unofficialRank = contestUnofficialData.data.result.rows.find(row => row.party.members.some(member => member.handle === codeforcesId));
    if (!unofficialRank) {
      return res.status(404).json({
        message: "User not found in contest"
      });
    }else if(unofficialRank.party.participantType !== "VIRTUAL"){
      return res.status(401).json({
        message: "User wasn't a virtual participant"
      })
    }

    const officialRanks = contestUnofficialData.data.result.rows.filter(row => row.party.participantType === 'CONTESTANT');
    const nextOfficialUser = officialRanks.find(row => row.rank > unofficialRank.rank);

    let officialRank = contestOfficialData.data.result.rows.length;
    if (nextOfficialUser) {
      const nextOfficialUserHandle = nextOfficialUser.party.members[0].handle;
      const nextOfficialUserRow = contestOfficialData.data.result.rows.find(row => row.party.members.some(member => member.handle === nextOfficialUserHandle));
      if (nextOfficialUserRow) {
        officialRank = nextOfficialUserRow.rank;
      }
    }

    // User's last rating
    const lastRating = user.contests.length > 0 ? user.contests[user.contests.length - 1].newRating : 0;

    // New rating (ELO Method)
    let ratingChange = 0;
    if (isRatedForUser(lastRating, contestOfficialData.data.result.contest)) {
      const opponentAverageRating = await calculateAverageRating(contestId, contestOfficialData.data.result.rows, contestOfficialData.data.result.contest.name);
      ratingChange = calculateEloRatingChange(lastRating, officialRank, contestOfficialData.data.result.rows.length, opponentAverageRating);
    }

    const newRating = lastRating + ratingChange;
    // Add contest in user's list
    user.contests.push({ contestId, rank: officialRank, totalParticipants: contestOfficialData.data.result.rows.length, oldRating: lastRating, newRating, ratingChanged: ratingChange });
    user.highestRating = Math.max(user.highestRating, newRating);
    await user.save();

    res.status(200).json(user);

  } catch (error) {
    console.error(error);  // Log the error
    res.status(500).json({
      message: "Internal Server Error from add",
      error: error.message // Include error message in response
    });
  }
});

const isRatedForUser = (rating, contest) => {
  if (contest.name.includes('Div. 1')) return true;
  if (contest.name.includes('Div. 2') && rating >= 1900) return false;
  if (contest.name.includes('Div. 3') && rating >= 1600) return false;
  if (contest.name.includes('Div. 4') && rating >= 1400) return false;
  return true;
};

const calculateEloRatingChange = (rating, rank, totalParticipants, opponentAverageRating) => {
  const K = 800; // max 800 inc in rating
  const actualScore = 1 - (rank - 1) / totalParticipants;
  const expectedScore = 1 / (1 + Math.pow(10, (opponentAverageRating - rating) / 400));
  return Math.round(K * (actualScore - expectedScore));
};

const calculateAverageRating = async (contestId, officialRows, contestName) => {
  try {
    const existingRating = await ContestRating.findOne({ contestId });
    if (existingRating) {
      return existingRating.averageRating;
    }

    const batchsize = 100;
    let totalRating = 0;

    for (let i = 0; i < officialRows.length; i += batchsize) {
      const batchHandles = officialRows.slice(i, Math.min(i + batchsize, officialRows.length)).map(row => row.party.members[0].handle).join(';');
      const batchResponse = await axios.get(`https://codeforces.com/api/user.info?handles=${batchHandles}`);

      batchResponse.data.result.forEach(user => {
        if (user.rating != undefined) {
          totalRating += user.rating;
        }
      });
    }

    const averageRating = Math.round(totalRating / officialRows.length);

    const newContestRating = new ContestRating({
      contestId,
      contestName,
      averageRating,
    });
    await newContestRating.save();
    return averageRating;

  } catch (error) {
    console.error("Error fetching user ratings:", error); // Log the error
    throw error;
  }
};

module.exports = router;
