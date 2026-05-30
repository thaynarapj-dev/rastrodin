const express = require('express');
const cors = require('cors');
const categoriesRoutes = require('./routes/categories.routes');

const app = express();
const port = 8082;

app.use(cors());
app.use(express.json());
app.use(categoriesRoutes);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
