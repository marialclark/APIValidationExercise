process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../app");
const db = require("../db");

let testBookIsbn;

beforeEach(async () => {
  let result = await db.query(`
    INSERT INTO
      books (isbn, amazon_url, author, language, pages, publisher, title, year)
      VALUES (
        '0691161518',
        'http://a.co/eobPtX2',
        'Matthew Lane',
        'English',
        264,
        'Princeton University Press',
        'Power-Up: Unlocking the Hidden Mathematics in Video Games',
        2017
      )
      RETURNING isbn`);
  testBookIsbn = result.rows[0].isbn;
});

afterEach(async () => {
  await db.query("DELETE FROM books");
});

afterAll(async () => {
  await db.end();
});

describe("GET /books", () => {
  test("Gets a list of books", async () => {
    const res = await request(app).get("/books");
    expect(res.statusCode).toBe(200);
    expect(res.body.books).toHaveLength(1);
    expect(res.body.books[0]).toEqual({
      isbn: testBookIsbn,
      amazon_url: "http://a.co/eobPtX2",
      author: "Matthew Lane",
      language: "English",
      pages: 264,
      publisher: "Princeton University Press",
      title: "Power-Up: Unlocking the Hidden Mathematics in Video Games",
      year: 2017,
    });
  });
});

describe("GET /books/:isbn", () => {
  test("Gets a single book by ISBN", async () => {
    const res = await request(app).get(`/books/${testBookIsbn}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.book).toEqual({
      isbn: testBookIsbn,
      amazon_url: "http://a.co/eobPtX2",
      author: "Matthew Lane",
      language: "English",
      pages: 264,
      publisher: "Princeton University Press",
      title: "Power-Up: Unlocking the Hidden Mathematics in Video Games",
      year: 2017,
    });
  });

  test("Responds with 404 for a non-existent book", async () => {
    const res = await request(app).get("/books/9999999999");
    expect(res.statusCode).toBe(404);
  });
});

describe("POST /books", () => {
  test("Creates a new book", async () => {
    const newBook = {
      isbn: "1234567890",
      amazon_url: "http://example.com/book",
      author: "Jane Doe",
      language: "French",
      pages: 200,
      publisher: "Example Publisher",
      title: "New Book Title",
      year: 2022,
    };

    const res = await request(app).post("/books").send(newBook);
    expect(res.statusCode).toBe(201);
    expect(res.body.book).toEqual(newBook);
  });

  test("Fails validation for invalid data", async () => {
    const invalidBook = {
      isbn: "1234567890", // Missing required fields
      amazon_url: "not-a-url",
    };

    const res = await request(app).post("/books").send(invalidBook);
    expect(res.statusCode).toBe(400);
    expect(res.body.error.message).toEqual(
      expect.arrayContaining([
        "instance requires property \"author\"",
        "instance requires property \"language\"",
        "instance requires property \"pages\"",
        "instance requires property \"publisher\"",
        "instance requires property \"title\"",
        "instance requires property \"year\"",
      ])
    );
  });
});

describe("PUT /books/:isbn", () => {
  test("Updates an existing book", async () => {
    const updatedData = {
      isbn: testBookIsbn,
      amazon_url: "http://example.com/updated-book",
      author: "Updated Author",
      language: "Spanish",
      pages: 400,
      publisher: "Updated Publisher",
      title: "Updated Book Title",
      year: 2024,
    };

    const res = await request(app).put(`/books/${testBookIsbn}`).send(updatedData);
    expect(res.statusCode).toBe(200);
    expect(res.body.book).toEqual(updatedData);
  });

  test("Fails validation for invalid data", async () => {
    const invalidData = {
      amazon_url: "not-a-url", // Missing other required fields
    };

    const res = await request(app).put(`/books/${testBookIsbn}`).send(invalidData);
    expect(res.statusCode).toBe(400);
    expect(res.body.error.message).toEqual(
      expect.arrayContaining([
        "instance requires property \"author\"",
        "instance requires property \"language\"",
        "instance requires property \"pages\"",
        "instance requires property \"publisher\"",
        "instance requires property \"title\"",
        "instance requires property \"year\"",
      ])
    );
  });

  test("Responds with 404 for non-existent book", async () => {
    const res = await request(app).put("/books/9999999999").send({
      isbn: "9999999999",
      amazon_url: "http://example.com/book",
      author: "Jane Doe",
      language: "English",
      pages: 100,
      publisher: "Publisher",
      title: "Title",
      year: 2020,
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("DELETE /books/:isbn", () => {
  test("Deletes an existing book", async () => {
    const res = await request(app).delete(`/books/${testBookIsbn}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ message: "Book deleted" });

    const checkRes = await request(app).get(`/books/${testBookIsbn}`);
    expect(checkRes.statusCode).toBe(404);
  });

  test("Responds with 404 for non-existent book", async () => {
    const res = await request(app).delete("/books/9999999999");
    expect(res.statusCode).toBe(404);
  });
});
