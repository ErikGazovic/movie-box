import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import session from "express-session";
import bcrypt from "bcrypt";
import { Strategy } from "passport-local";
import passport from "passport";
import axios from "axios";
import env from "dotenv";

const app = express();
const port = 3000;
const saltRounds = 6;
env.config();

const year = new Date().getFullYear();


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


app.use(session({
    secret: process.env.SESSION_SECRET, // YOUR SECRET //
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24
    },
}));
app.use(passport.initialize());
app.use(passport.session());


const db = new pg.Client({
    user: process.env.DB_USER, // YOUR USERNAME FOR PostgreSQL //
    host: process.env.DB_HOST, // YOUR LOCALHOST //
    database: process.env.DB_DATABASE, // NAME OF YOUR DATABASE//
    password: process.env.DB_PASSWORD, // YOUR PostgreSQL PASSWORD //
    port: process.env.DB_PORT, // YOUR PORT //
  });

db.connect();

const movieAPIKey = process.env.MOVIE_DB_API_KEY; // YOUR OMDBAPI API KEY //
const movieDataURL = "http://www.omdbapi.com/?";

app.get("/", (req, res) => {
    res.render("index.ejs", {year: year});
});

app.get("/login", (req, res) => {
    res.render("login.ejs", {year: year});
});

app.post("/login", (req, res) => {
    passport.authenticate("local",
        (err, user, options) => {
          if (user) {
            const userId = user.id;
            const email = user.email;
            const username = email.split("@")[0];
            req.session.isLoggedIn = true;
            if (req.body.remember === "on") {
                setTimeout(() => {
                    res.redirect(`/user-page-${userId}/${username}`);
                }, 1000);
            } else {
                req.session.cookie.maxAge = 1000;
                        setTimeout(() => {
                            res.redirect(`/user-page-${userId}/${username}`);
                        }, 1000);
                    }
        } else {
            if (options.message === "Wrong password") {
                res.render("login.ejs", { passwordMessage: options.message});
            } else {
                res.render("login.ejs", { message: options.message});
            };
            
          };
    })(req, res)
  });

passport.use(new Strategy ({usernameField: "email", passwordField: "password"}, async function verify(email, password, cb) {
    try {
        const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        
        if (checkResult.rows.length > 0) {
            const user = checkResult.rows[0]; 
            const storedHashedPassword = user.password;
            bcrypt.compare(password, storedHashedPassword, (err, result) => {
                if (err) {
                    return cb(err)
                } else {
                    if (result) {
                        return cb(null, user)
                    } else {
                        return cb(null, false, {message : "Wrong password"});
                    }
                }
            })
            
        } else {
            return cb(null, false, {message : "User with this email does not exist"});
        }
            
        
      } catch (err) {
        console.log("error");
        return cb(err)
      }
}));


app.get("/logout", (req, res) => {
    req.logout(function (err) {
      if (err) {
        return next(err);
      }
      res.redirect("/");
    });
  });


app.get("/register", (req, res) => {
    res.render("register.ejs",  {year: year});
});

app.post("/register", async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const repPassword = req.body["rep-password"];
    let passwordMessage = "";
    

   
  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [email,]);
    if (checkResult.rows.length > 0) {
        let message = "User with this email already exists";
      res.render("register.ejs", {message: message});
    } else if (checkRegisterPassword(password, repPassword)[0] == false) {
        passwordMessage = checkRegisterPassword(password, repPassword)[1];
        res.render("register.ejs", {passwordMessage: passwordMessage});
    }
    
    else {
        bcrypt.hash(password, saltRounds, async (err, hash) => {
            if (err) {
                res.send(err);
            } else {
                const result = await db.query(
                    "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *", 
                    [email, hash]
                );
                setTimeout(() => {
                    const user = result.rows[0];
                    req.login(user, (err) => {
                        res.redirect("/user-page-");
                    }, 1000)});      
                }
            })
        }
    } catch (err) {
        console.log(err);
      }    
});

app.get("/user-page-:id/:name", async (req, res) => {
    const isLoggedIn = req.session.isLoggedIn;
    const userid = req.params.id;
    const username = req.params.name;
    if (isLoggedIn) {
        try {
            const result = await db.query(`SELECT * FROM user_reviews WHERE user_id = ${userid} ORDER BY upload_date DESC`);
            const userReviews = result.rows;
            res.render("user-page.ejs", {userid : userid, userReviews : userReviews, username: username});
        } catch (err) {
            res.send("Something went wrong");
        }
        
    } else {
        res.render("login.ejs");
    }
});

app.get("/add-review/:name/:id", async (req, res) => {
    const userID = req.params.id;
    const username = req.params.name;
    res.render("edit-add-review.ejs", {userID : userID, username: username});
});

app.get("/:name/user-review/review-id=:id", async (req, res) => {
    const user_review_id = req.params.id;
    const username = req.params.name;
    try {
        const result = await db.query(`SELECT * FROM user_reviews WHERE id = ${user_review_id}`);
        let review = result.rows[0];
        res.render("user-review.ejs", {review : review, username: username});
    } catch (err) {
        res.send("Something went wrong");
    }
    
})

app.post("/add", async (req, res) => {
    const username = req.body.username;
    const userid = req.body.userID;
    let date = new Date();
    let dd = date.getDate();
    if (dd < 10) {
        dd = "0" + dd;
    }
    
    let mm = date.getMonth();
    switch (mm.toString()) {
        case "1": mm = "Jan"; break;
        case "2": mm = "Feb"; break;
        case "3": mm = "Mar"; break;
        case "4": mm = "Apr"; break;
        case "5": mm = "May"; break;
        case "6": mm = "Jun"; break;
        case "7": mm = "Jul"; break;
        case "8": mm = "Aug"; break;
        case "9": mm = "Sep"; break;
        case "10": mm = "Oct"; break;
        case "11": mm = "Nov"; break;
        case "12": mm = "Dec"; break;
        default: break;
    }
    let yyyy = date.getFullYear();
    let fullDate = mm + " " + dd + " " + yyyy;
    let titleYear = req.body.title;
    let titleChopped = titleYear.split(" ");
    let cleanTitle = "";
    let movieYear = "";
    let resultData;
    if (titleChopped[titleChopped.length - 1].includes("(") && titleChopped[titleChopped.length - 1].includes(")")) {
        cleanTitle = titleChopped.slice(0, -1).join(" ");
        movieYear = titleYear.split(' ')[titleChopped.length - 1].replace("(", "").replace(")", "");
        resultData = await axios.get(movieDataURL + `t=${cleanTitle}&y=${movieYear}&apikey=${movieAPIKey}`);
    } else {
        cleanTitle = titleYear;
        resultData = await axios.get(movieDataURL + `t=${cleanTitle}&apikey=${movieAPIKey}`);
    }

        if (resultData.data["Error"] === "Movie not found!") {
            let movieNotFoundMessage = "Movie Not Found!";
            res.render(`edit-add-review.ejs`, {username : username, movieErrorMsg: movieNotFoundMessage, userID : userid} );
        } else if (!req.body["rating-value"]) {
            let ratingNotSelectedMessage = "You have to select rating";
            res.render(`edit-add-review.ejs`, {username : username, ratingErrorMsg: ratingNotSelectedMessage, userID : userid} );
        } else {
            let allRatings = [];
            for (var i = 0; i < resultData.data["Ratings"].length; i++) {
                let value = resultData.data["Ratings"][i]["Value"].split("/");
                allRatings.push(value[0]);
        
            }
            allRatings[1] = allRatings[1].replace("%", "");
    
    
            
            let MovieData = {
                id: userid,
                title: resultData.data["Title"],
                releaseDate: resultData.data["Released"],
                runtime: resultData.data["Runtime"].split(" ")[0],
                genre: resultData.data["Genre"],
                director: resultData.data["Director"],
                actors: resultData.data["Actors"],
                plot: resultData.data["Plot"],
                poster: resultData.data["Poster"],
                ratings: allRatings,
                boxOffice: resultData.data["BoxOffice"],
                review: req.body.review,
                userRating: req.body["rating-value"],
                uploadDate: fullDate,
            };
            console.log(fullDate);
            
            try {
                await db.query("INSERT INTO user_reviews " + 
                    "(user_id, title, director, genre, actors, plot, release_date, runtime, user_rating, user_review, box_office, rating_imdb, rating_rt, rating_mc, poster_url, upload_date)" +
                    " VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)"
                    , [
                        MovieData.id,
                        MovieData.title,
                        MovieData.director,
                        MovieData.genre,
                        MovieData.actors,
                        MovieData.plot,
                        MovieData.releaseDate,
                        MovieData.runtime,
                        MovieData.userRating,
                        MovieData.review,
                        MovieData.boxOffice,
                        MovieData.ratings[0],
                        MovieData.ratings[1],
                        MovieData.ratings[2],
                        MovieData.poster,
                        MovieData.uploadDate,
                    ]);
                    res.redirect(`/user-page-${userid}/${username}`);

        } catch (err) {
            res.send("Something went wrong");
        }
            
            
    } 
})

app.get("/:name/edit-review/userID=:userID&reviewID=:id", async (req, res) => {
    const reviewID = req.params.id;
    const userid = req.params.userID;
    const username = req.params.name;
    try {
        const result = await db.query(`SELECT * FROM user_reviews WHERE id = ${reviewID}`);
        const reviewData = result.rows[0];
        res.render("edit-add-review.ejs", {reviewData: reviewData, userid: userid, reviewID: reviewID, username: username});
    } catch (err) {
        res.send("Something went wrong");
    }

    
})

app.post("/edit", async (req, res) => {
    const userID = req.body.getUserId;
    const reviewID = req.body.getReviewId;
    const username = req.body.username;
    let date = new Date();
    let dd = date.getDate();
    if (dd < 10) {
        dd = "0" + dd;
    }
    
    let mm = date.getMonth();
    switch (mm.toString()) {
        case "1": mm = "Jan"; break;
        case "2": mm = "Feb"; break;
        case "3": mm = "Mar"; break;
        case "4": mm = "Apr"; break;
        case "5": mm = "May"; break;
        case "6": mm = "Jun"; break;
        case "7": mm = "Jul"; break;
        case "8": mm = "Aug"; break;
        case "9": mm = "Sep"; break;
        case "10": mm = "Oct"; break;
        case "11": mm = "Nov"; break;
        case "12": mm = "Dec"; break;
        default: break;
    }
    let yyyy = date.getFullYear();
    let fullDate = mm + " " + dd + " " + yyyy;
    let titleYear = req.body.title;
    let titleChopped = titleYear.split(" ");
    let cleanTitle = "";
    let movieYear = "";
    let resultData;
    if (titleChopped[titleChopped.length - 1].includes("(") && titleChopped[titleChopped.length - 1].includes(")")) {
        cleanTitle = titleChopped.slice(0, -1).join(" ");
        movieYear = titleYear.split(' ')[titleChopped.length - 1].replace("(", "").replace(")", "");
        resultData = await axios.get(movieDataURL + `t=${cleanTitle}&y=${movieYear}&apikey=${movieAPIKey}`);
    } else {
        cleanTitle = titleYear;
        resultData = await axios.get(movieDataURL + `t=${cleanTitle}&apikey=${movieAPIKey}`);
    }



    if (resultData.data["Error"] === "Movie not found!") {
        const result = await db.query(`SELECT * FROM user_reviews WHERE id = ${reviewID}`);
        const reviewData = result.rows[0];
        let movieNotFoundMessage = "Movie Not Found!";
        res.render(`edit-add-review.ejs`, {username : username, movieErrorMsg: movieNotFoundMessage, userid : userID, reviewID : reviewID, reviewData : reviewData} );
    } else if (!req.body["rating-value"]) {
        const result = await db.query(`SELECT * FROM user_reviews WHERE id = ${reviewID}`);
        const reviewData = result.rows[0];
        let ratingNotSelectedMessage = "You have to select rating";
        res.render(`edit-add-review.ejs`, {username : username, ratingErrorMsg: ratingNotSelectedMessage, userid : userID, reviewID : reviewID, reviewData : reviewData} );
    } else {

    
        let allRatings = [];
        for (var i = 0; i < resultData.data["Ratings"].length; i++) {
            let value = resultData.data["Ratings"][i]["Value"].slice(1, 3).split("/");
            allRatings.push(value[0]);
    
        }

        allRatings[1] = allRatings[1].replace("%", "");
    
        let MovieData = {
            title: resultData.data["Title"],
            releaseDate: resultData.data["Released"],
            runtime: resultData.data["Runtime"].split(" ")[0],
            genre: resultData.data["Genre"],
            director: resultData.data["Director"],
            actors: resultData.data["Actors"],
            plot: resultData.data["Plot"],
            poster: resultData.data["Poster"],
            ratings: allRatings,
            boxOffice: resultData.data["BoxOffice"],
            review: req.body.review,
            userRating: req.body["rating-value"],
            uploadDate: fullDate,
        };

        try {
            await db.query(`UPDATE user_reviews 
                SET (user_id, title, director, genre, actors, plot, release_date, runtime, user_rating, user_review, box_office, rating_imdb, rating_rt, rating_mc, poster_url, upload_date) = 
                ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                WHERE id = ${reviewID}`, 
                [
                    userID,
                    MovieData.title,
                    MovieData.director,
                    MovieData.genre,
                    MovieData.actors,
                    MovieData.plot,
                    MovieData.releaseDate,
                    MovieData.runtime,
                    MovieData.userRating,
                    MovieData.review,
                    MovieData.boxOffice,
                    MovieData.ratings[0],
                    MovieData.ratings[1],
                    MovieData.ratings[2],
                    MovieData.poster,
                    MovieData.uploadDate,
                ]);
                res.redirect(`/user-page-${userID}/${username}`);
        } catch (err) {
            res.send("Something went wrong");
        }
            
    }    
    });

app.post("/delete/userID=:userID/review-id=:id", async (req, res) => {
    const reviewID = req.params.id;
    const userID = req.params.userID;
    const username = req.body.username;
    try {
        await db.query(`DELETE FROM user_reviews WHERE id = ${reviewID}`);
        res.redirect(`/user-page-${userID}/${username}`);
    } catch (err) {
        res.send("Something went wrong");
    }
    
})


passport.serializeUser((user, cb) => {
    cb(null, user);
});

passport.deserializeUser((user, cb) => {
    cb(null, user);
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`)
});




function checkRegisterPassword (password, reppeatedPassword) {
    const symbols = "+-()&#%$".split("");
    let symbolsCount = 0;
    const alphabetLowerCase = 'abcdefghijklmnopqrstuvwxyz'.split('');
    let lowerCaseCount = 0;
    const alphabetUpperCase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
    let upperCaseCount = 0;
    const numbers  = "1234567890".split("");
    let numbersCount = 0;
    for (var i = 0; i < symbols.length; i++) {
        if (password.includes(symbols[i])) {
            symbolsCount++;
            if (symbolsCount > 0) {
                break;
            }
        } 
    }

    for (var i = 0; i < alphabetLowerCase.length; i++) {
        if (password.includes(alphabetLowerCase[i])) {
            lowerCaseCount++;
            if (lowerCaseCount > 0) {
                break;
            }
        }
    }

    for (var i = 0; i < alphabetUpperCase.length; i++) {
        if (password.includes(alphabetUpperCase[i])) {
            upperCaseCount++;
            if (upperCaseCount > 0) {
                break;
            }
        }
    }

    for (var i = 0; i < numbers.length; i++) {
        if (password.includes(numbers[i])) {
            numbersCount++;
            if (numbersCount > 0) {
                break;
            }
        }
    }


    if (password != reppeatedPassword) {
        let passwordMessage = "Passwords don't match";
        return [false, passwordMessage];
    }
    else if (password.length < 6) {
        let passwordMessage = "Password is too short";
        return [false, passwordMessage];
    }
    else if (password.length > 20) {
        let passwordMessage = "Password is too long";
        return [false, passwordMessage];
    }
    else if (symbolsCount < 1) {
        let passwordMessage = "Password must have at least 1 of these symbols: +, -, (, ), &, #, %, $";
        return [false, passwordMessage];
    }
    else if (lowerCaseCount < 1) {
        let passwordMessage = "Password must contains at least 1 lower cased character";
        return [false, passwordMessage];
    }
    else if (upperCaseCount < 1) {
        let passwordMessage = "Password must contains at least 1 upper cased character";
        return [false, passwordMessage];
    }
    else if (numbersCount < 1) {
        let passwordMessage = "Password must contains at least 1 number";
        return [false, passwordMessage];
    }
    else {
        return true;
    }
    
}






