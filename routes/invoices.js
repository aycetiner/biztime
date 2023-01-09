const express = require("express");
const slugify = require("slugify");
const db = require("../db");
const ExpressError = require("../expressError");

const router = new express.Router();

router.get("/", async function (req, res, next) {
  try {
    const results = await db.query(
      `SELECT id, comp_code 
      FROM invoices
      ORDER BY id`
    );

    return res.json({ invoices: results.rows });
  } catch (err) {
    return next(err);
  }
});

router.get("/:id", async function (req, res, next) {
  try {
    let id = req.params.id;
    const results = await db.query(
      `SELECT id, amt, paid, add_date, paid_date, c.code, c.name, c.description 
      FROM invoices AS i 
      INNER JOIN companies AS c 
      ON c.code = i.comp_code 
      WHERE id=$1`,
      [id]
    );

    if (results.rows.length === 0) {
      throw new ExpressError(`Invoice not found with id ${id}`, 404);
    }

    const data = results.rows[0];
    const invoice = {
      id: data.id,
      company: {
        code: data.comp_code,
        name: data.name,
        description: data.description,
      },
      amt: data.amt,
      paid: data.paid,
      add_date: data.add_date,
      paid_date: data.paid_date,
    };

    return res.json({ invoice: invoice });
  } catch (err) {
    return next(err);
  }
});

router.post("/", async function (req, res, next) {
  try {
    const { comp_Code, amt } = req.body;

    const results = await db.query(
      `INSERT INTO invoices (comp_Code, amt) 
      VALUES($1, $2) 
      RETURNING id, comp_Code, amt, paid, add_date, paid_date`,
      [comp_Code, amt]
    );
    if (results.rows.length === 0) {
      throw new ExpressError(
        `Required data is missing! Check company information`,
        404
      );
    }
    return res.json({ company: results.rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.put("/:id", async function (req, res, next) {
  try {
    const { amt, paid } = req.body;
    const id = req.params.id;
    let paidDate = null;

    const currResult = await db.query(
      `SELECT paid
           FROM invoices
           WHERE id = $1`,
      [id]
    );

    if (currResult.rows.length === 0) {
      throw new ExpressError(`No such invoice: ${id}`, 404);
    }

    const currPaidDate = currResult.rows[0].paid_date;

    if (!currPaidDate && paid) {
      paidDate = new Date();
    } else if (!paid) {
      paidDate = null;
    } else {
      paidDate = currPaidDate;
    }

    const result = await db.query(
      `UPDATE invoices
           SET amt=$1, paid=$2, paid_date=$3
           WHERE id=$4
           RETURNING id, comp_code, amt, paid, add_date, paid_date`,
      [amt, paid, paidDate, id]
    );

    return res.json({ invoice: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.delete("/:id", async function (req, res, next) {
  try {
    const id = req.params.id;
    const result = await db.query(
      `DELETE FROM invoices
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new ExpressError(`No such invoice: ${id}`, 404);
    }
    return res.json({ status: "deleted" });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
