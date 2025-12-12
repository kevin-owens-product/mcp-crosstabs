import { Router } from 'express';
import {
  listCrosstabs,
  searchCrosstabs,
  getCrosstab,
  analyzeCrosstab,
  handleChatMessage,
  listAudiences,
  searchAudiences,
  getAudience,
} from './handlers';

export const router = Router();

// Crosstab routes
router.get('/crosstabs', listCrosstabs);
router.get('/crosstabs/search', searchCrosstabs);
router.get('/crosstabs/:id', getCrosstab);
router.post('/analyze', analyzeCrosstab);

// Audience routes
router.get('/audiences', listAudiences);
router.get('/audiences/search', searchAudiences);
router.get('/audiences/:id', getAudience);

// Chat route
router.post('/chat', handleChatMessage);
