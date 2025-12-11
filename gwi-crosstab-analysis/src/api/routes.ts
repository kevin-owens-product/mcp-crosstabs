import { Router } from 'express';
import {
  listCrosstabs,
  searchCrosstabs,
  getCrosstab,
  analyzeCrosstab,
  handleChatMessage,
} from './handlers';

export const router = Router();

// Crosstab routes
router.get('/crosstabs', listCrosstabs);
router.get('/crosstabs/search', searchCrosstabs);
router.get('/crosstabs/:id', getCrosstab);
router.post('/analyze', analyzeCrosstab);

// Chat route
router.post('/chat', handleChatMessage);
