const express = require("express");
const slugify = require("slugify");
const db = require("../db");
const ExpressError = require("../expressError");

const router = new express.Router();

router.get("/", async function (req, res, next) {
  try {
    const results = await db.query(
      `SELECT code, name 
      FROM companies
      ORDER BY name`
    );

    return res.json({ companies: results.rows });
  } catch (err) {
    return next(err);
  }
});

router.get("/:code", async function (req, res, next) {
  try {
    let reqCode = req.params.code;
    const results = await db.query(
      `SELECT c.code, c.name, c.description, i.id 
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
    const { name, description } = req.body;
    let code = slugify(name, { lower: true });

    if (code.trim() === "" || name.trim() === "") {
      throw new ExpressError(
        `Required data is missing! Check company code and name`,
        404
      );
    }
    const results = await db.query(
      `INSERT INTO companies (code, name, description) 
      VALUES($1, $2, $3) 
      RETURNING code, name, description`,
      [code, name, description]
    );

    return res.status(201).json({ company: results.rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.put("/:code", async function (req, res, next) {
  try {
    const { name, description } = req.body;
    const code = req.params.code;

    if (name.trim() === "") {
      throw new ExpressError(
        `Required data is missing! Check company name`,
        404
      );
    }

    const results = await db.query(
      `UPDATE companies 
      SET name = $1, description = $2 
      WHERE  code = $3 
      RETURNING code, name, description`,
      [name, description, code]
    );

    if (results.rows.length === 0) {
      throw new ExpressError(`Company not found`, 404);
    }
    return res.json({ company: results.rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.delete("/:code", async function (req, res, next) {
  try {
    const code = req.params.code;
    const result = await db.query("DELETE FROM companies WHERE code = $1", [
      code,
    ]);
    return res.json({ status: "deleted" });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
