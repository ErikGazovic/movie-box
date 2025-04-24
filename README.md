# movie-box
Website for adding your movie reviews

CODE EDITOR: VSCODE

TECHNOLOGY
Frontend: HTML5, CSS, Javascript
Backend: Node.js, Express.js
Database: PostgreSQL

TO SET UP THE WEBSITE
1. download zip file and extract it
2. open new terminal and write npm install to import all dependecies
3. create your PostgreSQL database and create 2 tables (users, user_reviews)
Code to create table users:

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(70),
  password VARCHAR(100)
)

Code to create table user_reviews:

CREATE TABLE user_reviews
(
    id SERIAL PRIMARY KEY,
    user_id integer,
    title VARCHAR(150),
    director VARCHAR(100),
    genre VARCHAR(70),
    actors VARCHAR(100),
    plot VARCHAR(300),
    release_date VARCHAR(12),
    runtime integer,
    user_rating integer,
    user_review VARCHAR,
    box_office VARCHAR(12),
    rating_imdb float,
    rating_rt integer,
    rating_mc integer,
    poster_url VARCHAR(200),
    upload_date date
)
4. Change variables like APIKEY or in DATABASE CONNECTION SET UP (password, port, name of database, host, user)
Here you can create your API KEY -> https://www.omdbapi.com/apikey.aspx 
5. Open new terminal again and type 'nodemon index.js'
6. Go to your browser and type 'http://localhost:3000/' in your search bar
