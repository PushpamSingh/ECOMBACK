import { Router } from 'express';
import * as category from '../controllers/category.controller.js';
import { protect, adminOnly } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { categorySchema } from '../validations/catalog.validation.js';

const router = Router();

// Public
router.get('/', category.listCategories);

// Admin
router.get('/admin', protect, adminOnly, category.listCategoriesAdmin);
router.post('/', protect, adminOnly, validate(categorySchema), category.createCategory);
router.get('/:id', category.getCategory);
router.patch('/:id', protect, adminOnly, validate(categorySchema.partial()), category.updateCategory);
router.delete('/:id', protect, adminOnly, category.deleteCategory);

export default router;
