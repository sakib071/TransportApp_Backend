const Category = require('../models/Category');
const AuditLog = require('../models/AuditLog');
const catchAsync = require('../utils/catchAsync');

const PALETTE = ['#3D5A80', '#C9A227', '#7C6354', '#4C6E5D', '#9B4F6E'];
const TINTS = ['#E3E9F0', '#F7EFD2', '#EDE4DC', '#DFEAE3', '#F1DEE6'];

exports.list = catchAsync(async (req, res) => {
  const categories = await Category.find().sort('label');
  res.json({ categories });
});

exports.create = catchAsync(async (req, res) => {
  const { label } = req.body;
  if (!label || label.trim().length < 2) {
    return res.status(400).json({ message: 'Enter a category name.' });
  }
  const key = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const existing = await Category.findOne({ key });
  if (existing) return res.status(409).json({ message: 'That category already exists.' });

  const count = await Category.countDocuments({ builtIn: false });
  const idx = count % PALETTE.length;
  const category = await Category.create({
    key, label: label.trim(), icon: '🏷️', color: PALETTE[idx], tint: TINTS[idx], builtIn: false
  });
  await AuditLog.create({
    action: 'category_added',
    detail: `Category added: ${label}`,
    actor: req.user._id,
    actorName: req.user.name
  });
  res.status(201).json({ category });
});

exports.remove = catchAsync(async (req, res) => {
  const category = await Category.findOne({ key: req.params.key });
  if (!category) return res.status(404).json({ message: 'Category not found.' });
  if (category.builtIn) return res.status(400).json({ message: "Built-in categories can't be removed." });
  await category.deleteOne();
  await AuditLog.create({
    action: 'category_removed',
    detail: `Category removed: ${req.params.key}`,
    actor: req.user._id,
    actorName: req.user.name
  });
  res.json({ success: true });
});
