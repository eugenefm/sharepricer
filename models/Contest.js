// contests
//   -name
//   -start date
//   -end date
//   -security/stock
//     --name
//     --ticker
//     --recent price
//     --last updated
//   -public/private
//   -password
//   -admin
//   -members

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ContestSchema = new Schema({
  admin: {
    type: Schema.Types.ObjectId,
    ref: 'users'
  },
  text: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  ticker: {
    type: String,
    required: true
  },
  picks: [
    {
      type: Schema.Types.ObjectId,
      ref: 'picks'
    }
  ],
  date: {
    type: Date,
    default: Date.now
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  }
});

module.exports = Contest = mongoose.model('contest', ContestSchema);