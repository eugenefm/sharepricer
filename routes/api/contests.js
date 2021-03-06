const express = require('express');
const auth = require('../../middleware/auth');
const router = express.Router();
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');

const User = require('../../models/User');
const Pick = require('../../models/Pick');
const Contest = require('../../models/Contest');

// @route   POST api/contests
// @desc    Create a contest
// @access  Private

router.post(
  '/',
  [
    auth,
    [
      check('name', 'Contest name is required')
        .not()
        .isEmpty(),
      check('ticker', 'You must provide a valid stock ticker.')
        .not()
        .isEmpty(),
      check('startDate', 'Contest start date must be after today.').isAfter(new Date().toDateString()),
      check('endDate', 'End date of contest must be valid and after start date.').custom(
        (value, { req }) => new Date(value) > new Date(req.body.startDate)
      )
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { name, ticker, startDate, endDate, password } = req.body;
      const newContest = new Contest({
        name,
        ticker,
        startDate,
        endDate,
        admin: req.user.id
      });
      if (password) {
        const salt = await bcrypt.genSalt(10);

        newContest.password = await bcrypt.hash(password, salt);
        newContest.private = true;
      }
      const contest = await newContest.save();
      res.json(contest);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   GET api/contests
// @desc    Get all contests
// @access  Public
router.get('/', async (req, res) => {
  try {
    const contests = await Contest.find()
      .populate('admin', ['displayName'])
      .sort({ endDate: -1 })
      .select('-password');
    res.json(contests);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/contests/:contest_id
// @desc    Get one contest by ID
// @access  Public
router.get('/:contest_id', async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.contest_id)
      .select('-password')
      .populate('admin', ['displayName', 'avatar'])
      .populate({
        path: 'picks',
        select: { user: 1, price: 1 },
        populate: {
          path: 'user',
          select: { displayName: 1 }
        }
      });
    if (!contest) return res.status(400).json({ msg: 'Contest not found.' });
    res.json(contest);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PATCH api/contests/:contest_id
// @desc    Update a contest
// @access  Private

router.patch(
  '/:contest_id',
  [
    auth,
    [
      check('name', 'Contest name is required')
        .optional()
        .not()
        .isEmpty(),
      check('ticker', 'You must provide a valid stock ticker.')
        .optional()
        .not()
        .isEmpty(),
      check('startDate', 'Contest start date must be after today.')
        .optional()
        .isAfter(new Date().toDateString()),
      check('endDate', 'End date of contest must be valid and after start date.')
        .optional()
        .custom((value, { req }) => new Date(value) > new Date(req.body.startDate))
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const updates = Object.keys(req.body);
    try {
      const contest = await Contest.findOne({ _id: req.params.contest_id });
      if (!contest) return res.status(400).json({ msg: 'Contest not found.' });
      if (req.user.id !== contest.admin) {
        return res.status(400).json({ msg: 'You are not authorized to edit this contest.' });
      }

      if (req.body.password) {
        const salt = await bcrypt.genSalt(10);

        req.body.password = await bcrypt.hash(req.body.password, salt);
      }

      updates.forEach(update => {
        contest[update] = req.body[update];
      });

      await contest.save();
      res.json(contest);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

router.delete('/:contest_id', auth, async (req, res) => {
  try {
    const contest = await Contest.findOneAndRemove({ _id: req.params.contest_id, admin: req.user.id });
    if (!contest) return res.status(400).json({ msg: 'Permission Denied.' });
    res.json({ msg: 'Contest deleted.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
