const express = require('express');
const auth = require('../../middleware/auth');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');

// const User = require('../../models/User');
const Pick = require('../../models/Pick');
// const Contest = require('../../models/Contest');

router.post(
  '/',
  [
    auth,
    [
      check('price', 'Please enter a valid possible price.')
        .isFloat({ min: 0 })
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { price, contestId } = req.body;
      const pick = await Pick.findOne({ user: req.user.id, contest: contestId });
      const contest = await Contest.findOne({ _id: contestId });
      console.log(contest.startDate);
      console.log(new Date());
      if (new Date() > contest.startDate) {
        return res.status(400).json({ msg: 'Cannot add or modify a pick after a contest has started.' });
      }
      if (pick) {
        pick.price = price;
        await pick.save();
        return res.json(pick);
      }
      const newPick = new Pick({
        contest,
        price,
        user: req.user.id
      });

      await newPick.save();
      res.json(newPick);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

router.delete('/:pick_id', auth, async (req, res) => {
  try {
    const pick = await Pick.findOneAndRemove({ _id: req.params.pick_id, user: req.user.id });
    if (!pick) return res.status(400).json({ msg: 'Permission Denied.' });
    res.json({ msg: 'Contest deleted.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
