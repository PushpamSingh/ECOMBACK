import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import ApiError from '../utils/ApiError.js';
import { signToken } from '../utils/token.js';
import { isProd } from '../config/env.js';
import User from '../models/User.js';

const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  avatar: user.avatar,
  role: user.role,
});

export const register = asyncHandler(async (req, res) => {
  const { name, password, phone } = req.body;
  const email = req.body.email.toLowerCase().trim();
  const exists = await User.findOne({ email });
  if (exists) throw new ApiError(409, 'Email already registered');

  const user = await User.create({ name, email, password, phone });
  const token = signToken({ id: user._id, role: user.role });
  res.cookie('token', token, cookieOptions);
  sendSuccess(res, { status: 201, message: 'Registered', data: { token, user: publicUser(user) } });
});

export const login = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const email = req.body.email.toLowerCase().trim();
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (!user.isActive) throw new ApiError(403, 'Account is disabled');

  const token = signToken({ id: user._id, role: user.role });
  res.cookie('token', token, cookieOptions);
  sendSuccess(res, { message: 'Logged in', data: { token, user: publicUser(user) } });
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token');
  sendSuccess(res, { message: 'Logged out' });
});

export const getMe = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: { user: publicUser(req.user), addresses: req.user.addresses } });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, avatar } = req.body;
  if (name !== undefined) req.user.name = name;
  if (phone !== undefined) req.user.phone = phone;
  if (avatar !== undefined) req.user.avatar = avatar;
  await req.user.save();
  sendSuccess(res, { message: 'Profile updated', data: { user: publicUser(req.user) } });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(400, 'Current password is incorrect');
  }
  user.password = newPassword;
  await user.save();
  sendSuccess(res, { message: 'Password changed' });
});

// ----- Addresses (embedded in user) -----
export const getAddresses = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: req.user.addresses });
});

export const addAddress = asyncHandler(async (req, res) => {
  if (req.body.isDefault) req.user.addresses.forEach((a) => (a.isDefault = false));
  req.user.addresses.push(req.body);
  await req.user.save();
  sendSuccess(res, { status: 201, message: 'Address added', data: req.user.addresses });
});

export const updateAddress = asyncHandler(async (req, res) => {
  const address = req.user.addresses.id(req.params.id);
  if (!address) throw new ApiError(404, 'Address not found');
  if (req.body.isDefault) req.user.addresses.forEach((a) => (a.isDefault = false));
  address.set(req.body);
  await req.user.save();
  sendSuccess(res, { message: 'Address updated', data: req.user.addresses });
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const address = req.user.addresses.id(req.params.id);
  if (!address) throw new ApiError(404, 'Address not found');
  address.deleteOne();
  await req.user.save();
  sendSuccess(res, { message: 'Address removed', data: req.user.addresses });
});
