const success = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({ success: true, data });
};

const error = (res, message, statusCode = 500, details = null) => {
  const response = { success: false, error: message };
  if (details) response.details = details;
  return res.status(statusCode).json(response);
};

const paginate = (query, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  return query.limit(limit).offset(offset);
};

const paginationMeta = (total, page, limit) => ({
  total,
  page: Number(page),
  limit: Number(limit),
  pages: Math.ceil(total / limit),
});

module.exports = { success, error, paginate, paginationMeta };
