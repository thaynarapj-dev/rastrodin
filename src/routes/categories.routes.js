const axios = require('axios');
const express = require('express');
const { getSupabaseConfig } = require('../config/supabase');
const { prepareCategoriesForCreate } = require('../helpers/categories.helper');

const router = express.Router();

router.get('/categories', async (req, res) => {
  try {
    const supabaseConfig = getSupabaseConfig(req.query.environment);
    const response = await axios.get(`${supabaseConfig.baseURL}/categories`, {
      headers: supabaseConfig.headers,
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/categories', async (req, res) => {
  try {
    console.log('Received categories:', req.body);
    const requestList = Array.isArray(req.body) ? req.body : [req.body];
    const environment = requestList[0]?.environment;
    const supabaseConfig = getSupabaseConfig(environment);

    console.info('Using URL:', supabaseConfig.baseURL);

    const uniqueCategories = await prepareCategoriesForCreate(requestList, supabaseConfig);

    const results = await Promise.all(uniqueCategories.map(async (category) => {
      const existing = await axios.get(`${supabaseConfig.baseURL}/categories`, {
        headers: supabaseConfig.headers,
        params: {
          name: `eq.${category.name}`,
          type: `eq.${category.type}`,
          parent_id: category.parent_id ? `eq.${category.parent_id}` : 'is.null',
        },
      });

      if (existing.data.length > 0) {
        return existing.data[0];
      }

      console.info('Creating category:', category);

      const response = await axios.post(`${supabaseConfig.baseURL}/categories`, category, {
        headers: supabaseConfig.headers,
      });
      return response.data;
    }));

    res.json(results);
  } catch (error) {
    // console.error('Error creating categories:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to create categories' });
  }
});

module.exports = router;
