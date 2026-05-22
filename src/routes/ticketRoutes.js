const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  createTicket,
  listTickets,
  getTicket,
  updateTicket,
  escalateTicket,
} = require('../controllers/ticketController');

const router = express.Router();

router.use(authMiddleware);

router.post('/', createTicket);
router.get('/', listTickets);
router.get('/:id', getTicket);
router.patch('/:id', updateTicket);
router.post('/:id/escalate', escalateTicket);

module.exports = router;
