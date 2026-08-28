const Category = require('../models/Category');
const Conversation = require('../models/Conversation');
const aiService = require('../services/aiService');
const catchAsync = require('../utils/catchAsync');

exports.suggestCategory = catchAsync(async (req, res) => {
  const { description } = req.body;
  if (!description || description.trim().length < 8) {
    return res.status(400).json({ message: 'Provide a description of at least 8 characters.' });
  }
  const categories = await Category.find();
  const result = await aiService.suggestCategory(description, categories);
  res.json(result);
});

exports.chat = catchAsync(async (req, res) => {
  const { sessionId, message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ message: 'Message is required.' });
  }

  let convo = sessionId ? await Conversation.findById(sessionId) : null;
  if (!convo) {
    convo = await Conversation.create({ user: req.user ? req.user._id : undefined, messages: [] });
  }

  const categories = await Category.find();
  const { reply, draft } = await aiService.chat(convo.messages, message, categories);

  convo.messages.push({ role: 'user', content: message });
  convo.messages.push({ role: 'assistant', content: reply });
  await convo.save();

  res.json({ sessionId: convo._id, reply, draft });
});
