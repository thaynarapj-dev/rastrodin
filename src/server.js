const axios = require('axios');
const express = require('express');
const cors = require('cors');
const app = express();
const port = 8082;

app.use(cors());
app.use(express.json());

const baseURLLocal = 'http://localhost:54321/rest/v1';
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value) => {
  return typeof value === 'string' && uuidRegex.test(value);
};

const getCategoryKey = (category) => {
  return `${category.name}::${category.type}::${category.parent_id || ''}`;
};

const resolveParentIds = async (categoriesList) => {
  const needsParentLookup = categoriesList.some((category) => {
    return category.parent_id && !isUuid(category.parent_id);
  });

  if (!needsParentLookup) {
    return categoriesList;
  }

  const categoriesResponse = await axios.get(baseURLLocal + '/categories', {
    params: {
      select: 'id,name,type,parent_id',
    },
  });

  return categoriesList.map((category) => {
    if (!category.parent_id || isUuid(category.parent_id)) {
      return category;
    }

    const parent = categoriesResponse.data.find((item) => {
      return item.name === category.parent_id
        && item.type === category.type
        && !item.parent_id;
    });

    if (!parent) {
      const error = new Error(`Parent category not found: ${category.parent_id}`);
      error.statusCode = 400;
      throw error;
    }

    return {
      ...category,
      parent_id: parent.id,
    };
  });
};

app.get('/categories', async (req, res) => {
  try {
    const response = await axios.get(baseURLLocal + '/categories');
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/categories', async (req, res) => {
  try {
    console.log('Received categories:', req.body);
    const categoriesList = Array.isArray(req.body) ? req.body : [req.body];
    const categoriesWithParentIds = await resolveParentIds(categoriesList);
    const uniqueCategories = categoriesWithParentIds.filter((category, index, list) => {
      return index === list.findIndex((item) => {
        return getCategoryKey(item) === getCategoryKey(category);
      });
    });

    const results = await Promise.all(uniqueCategories.map(async (category) => {
      const existing = await axios.get(baseURLLocal + '/categories', {
        params: {
          name: `eq.${category.name}`,
          type: `eq.${category.type}`,
          parent_id: category.parent_id ? `eq.${category.parent_id}` : 'is.null',
        },
      });

      if (existing.data.length > 0) {
        return existing.data[0];
      }

      const response = await axios.post(baseURLLocal + '/categories', category);
      return response.data;
    }));

    res.json(results);
  } catch (error) {
    console.error('Error creating categories:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to create categories' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
