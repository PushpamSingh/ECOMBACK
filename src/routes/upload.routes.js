import { Router } from 'express';
import * as uploadCtrl from '../controllers/upload.controller.js';
import { protect } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';

const router = Router();

// router.use(protect);

router.post('/image', upload.single('image'), uploadCtrl.uploadImage);
router.post('/images', upload.array('images', 6), uploadCtrl.uploadImages);

export default router;
