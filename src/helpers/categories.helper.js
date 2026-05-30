const axios = require('axios');

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value) => {
  return typeof value === 'string' && uuidRegex.test(value);
};

const getCategoryKey = (category) => {
  return `${category.name}::${category.type}::${category.parent_id || ''}`;
};

const removeRequestOnlyFields = (category) => {
  const { environment, ...categoryData } = category;
  return categoryData;
};

const hasCategoryFields = (category) => {
  return Object.keys(category).length > 0;
};

const validateCategories = (categoriesList) => {
  const invalidCategory = categoriesList.find((category) => {
    return !category.name || !category.type;
  });

  if (invalidCategory) {
    const error = new Error('Category name and type are required');
    error.statusCode = 400;
    throw error;
  }

  if (categoriesList.length === 0) {
    const error = new Error('No categories to create');
    error.statusCode = 400;
    throw error;
  }
};

const getUniqueCategories = (categoriesList) => {
  return categoriesList.filter((category, index, list) => {
    return index === list.findIndex((item) => {
      return getCategoryKey(item) === getCategoryKey(category);
    });
  });
};

const resolveParentIds = async (categoriesList, supabaseConfig) => {
  const needsParentLookup = categoriesList.some((category) => {
    return category.parent_id && !isUuid(category.parent_id);
  });

  if (!needsParentLookup) {
    return categoriesList;
  }

  const categoriesResponse = await axios.get(`${supabaseConfig.baseURL}/categories`, {
    headers: supabaseConfig.headers,
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

const prepareCategoriesForCreate = async (requestList, supabaseConfig) => {
  const categoriesList = requestList
    .map(removeRequestOnlyFields)
    .filter(hasCategoryFields);

  validateCategories(categoriesList);

  const categoriesWithParentIds = await resolveParentIds(categoriesList, supabaseConfig);

  return getUniqueCategories(categoriesWithParentIds);
};

module.exports = {
  prepareCategoriesForCreate,
};
