const express = require("express");
const db = require("../db");
const ExpressError = require("../expressError");

const router = new express.Router();

router.get("/", async function (req, res, next) {
  try {
    const results = await db.query(
      `SELECT i.code, i.name, c.code
      FROM industries AS i
      LEFT JOIN company_industry AS ci 
      ON i.code = ci.ind_code 
      LEFT JOIN companies AS c 
      ON ci.comp_code = c.code
      GROUP BY i.code, c.code`
    );

    return res.json({ industries: results.rows });
  } catch (err) {
    return next(err);
  }
});

router.get("/:code", async function (req, res, next) {
  try {
    let reqCode = req.params.code;
    const results = await db.query(
      `SELECT c.code, i.id 
        FROM companies AS c
        LEFT JOIN invoices AS i
        ON c.code = i.comp_code 
        WHERE c.code=$1`,
      [reqCode]
    );
    if (results.rows.length === 0) {
      throw new ExpressError(`Company not found with code ${reqCode}`, 404);
    }
    const { code, name, description } = results.rows[0];
    const id = results.rows.map((r) => r.id);

    return res.json({ company: { code, name, description, invoices: id } });
  } catch (err) {
    return next(err);
  }
});

router.post("/", async function (req, res, next) {
  try {
    const { name } = req.body;
    let indcode = slugify(indcode, { lower: true });

    const results = await db.query(
      `INSERT INTO industries (indcode, name) 
        VALUES($1, $2) 
        RETURNING indcode, name`,
      [indcode, name]
    );

    return res.status(201).json({ industry: results.rows[0] });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
