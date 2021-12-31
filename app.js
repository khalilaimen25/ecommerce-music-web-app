const express = require('express')
const mysql = require('mysql')
const session = require('express-session');
var flash = require('connect-flash')
var messages = require('express-messages')
const app = express()
app.use('/public', express.static('public'));
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

var admin = require('./controllers/admin.js')


app.set("view engine", "ejs")
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'khalil25',
    password: 'baboo666',
    database: 'music_ecommerce'
})
connection.connect()

app.use(express.urlencoded({ extended: false }))
app.use(session({
  resave: false, // don't save session if unmodified
  saveUninitialized: false, // don't create session until something stored
  secret: 'shhhh, very secret'
}));

// Session-persisted message middleware

app.use(function(req, res, next){
  var err = req.session.error;
  var msg = req.session.success;
  delete req.session.error;
  delete req.session.success;
  res.locals.message = '';
  if (err) res.locals.message = '<p class="msg error">' + err + '</p>';
  if (msg) res.locals.message = '<p class="msg success">' + msg + '</p>';
  next();
});

app.use(flash())
app.use(function (req, res, next) {
    res.locals.messages = messages(req, res)
    next()
})

const port = 3000

app.use('/admin', admin)

app.get('/', (req, res) => {
    user_session = req.session.user
    user_info = null
    user_cart = null
    if(user_session !== undefined){
      user_info = user_session[0]
      user_cart = user_session[1]
    } 

    sql = "select id, name, brand, image,  category, price, price - (price * promotion / 100) new_price, promotion, in_stock from products where promotion != 0 order by promotion desc limit 6"
    connection.query(sql, function(err, rows, fields, hotdeals){
      if(err) throw err
      hotdeals = rows
      sql = "select id, name, brand, image,  category, price, price - (price * promotion / 100) new_price, promotion, in_stock, sells from products where sells != 0 order by sells desc limit 10"
      connection.query(sql, function(err, rows, fields){
        if(err) throw err
        topsells = rows
        sql = "select id, name, brand, image,  category, price, price - (price * promotion / 100) new_price, promotion, in_stock, sells from products order BY id DESC limit 10"
        connection.query(sql, function(err, rows, fields){
          if(err) throw err
          news = rows
          sql = "SELECT p.id, p.name, brand, image,  category, price, price - (price * promotion / 100) new_price, promotion, in_stock, sells, sum(rating)/count(p.id) rating from products p, reviews r WHERE p.id = r.product_id GROUP BY p.id ORDER BY r.rating DESC limit 15 "
          connection.query(sql, function(err, rows, fields){
            if(err) throw err
            toprates = rows
            res.render('index', {user : user_info, cart : user_cart, hotdeals : hotdeals, topsells : topsells, news : news, toprates: toprates});
          })
      })
        // res.render('index', {user : user_info, cart : user_cart, hotdeals : hotdeals, topsells : topsells});
      })
      //console.log(hotdeals)
      // res.render('index', {user : user_info, cart : user_cart, hotdeals : hotdeals});
    })
      
})

app.route('/login')
.get( (req, res) => {
    user_session = req.session.user
    if(user_session){
      //console.log(user_session)
        res.redirect('/');}
    else
        res.render('login', {user : null})    
})
.post( (req, res) => {
    authenticate(req.body.username, req.body.password, function(err, user){
        if (user) {
          // Regenerate session when signing in
          // to prevent fixation
          req.session.regenerate(function(){
            // Store the user's primary key
            // in the session store to be retrieved,
            // or in this case the entire user object
            req.session.user = user;
            //console.log(req.session.user)
            req.session.success = 'Authenticated as ' + user.name
              + ' click to <a href="/logout">logout</a>. '
              + ' You may now access <a href="/restricted">/restricted</a>.';
              console.log('loged in succeess')
            req.flash('success', 'Welcome '+ user[0].username+' You are now loged in..')
            if(user[0].is_admin === 0)
              res.redirect('/');
            else  
              res.redirect('/admin');

          });
        } else {
          req.session.error = 'Authentication failed, please check your '
            + ' username and password.'
            + ' (use "tj" and "foobar")';
            console.log('check your credentials')
          res.redirect('/login');
        }
      });
})

app.get('/logout', (req, res) => {
  req.flash('info', 'Goodbye, You logged out')
    req.session.destroy(function(){
        res.redirect('/');
      });
})

app.route('/register')
.get( (req, res) => {
    user_session = req.session.user
    if(user_session){
      req.flash('info', 'You are already registred')
      res.redirect('/')
    }else
      res.render('register', {user : null});
})
.post( (req, res, next) => {
    username = req.body.username
    firstname = req.body.firstname
    lastname = req.body.lastname
    email = req.body.email
    password = req.body.password
    phone = req.body.phone
    address = req.body.address
    city = req.body.city
    country = req.body.country
    zipcode = req.body.zipcode

    sql = "select * from users where username = ?"
    connection.query(sql, username,function (err, rows, fields){
      if (err) throw err
      if(rows.length > 0){
        req.flash('danger', 'username already exist, use another one..')
        res.redirect('/register')
      }else{

        user = [username, firstname, lastname, email, password, phone, address, city, country, zipcode, 0]
        sql = "INSERT into users (username, firstname, lastname, email, password, phone, address, city, country, zipcode, is_admin) values (?,?,?,?,?,?,?,?,?,?,?)";
        connection.query(sql, user,function (err, rows, fields) {
          if (err) throw err
          req.flash('success', 'You are registred..')
          req.flash('info', 'Please log in..')
    
          res.redirect('/login')
        })            
      }
    })
})
// app.get('/login', (req, res) => {
//     res.render('/login');
// })

app.get('/store/categories', (req, res) => {
  user_session = req.session.user
  user_cart = null
  user_info = null
  if(user_session !== undefined){
    user_info = user_session[0]
    user_cart = user_session[1]
  }

  res.render('categories', {user : user_info, cart : user_cart})
})

app.get('/store/category/:category', (req, res) => {

  user_session = req.session.user
  user_cart = null
  user_info = null
  if(user_session !== undefined){
    user_info = user_session[0]
    user_cart = user_session[1]
  }
  category = req.params.category
  subcategory = req.params.subcategory

  sql = "select *, price - (price * promotion / 100) new_price from products where category = ? ORDER BY id DESC"
  connection.query(sql, category,function(err, rows, fields){
    if (err) throw err
    res.render('store', {user : user_info,
                        cart : user_cart,
                        products : rows,
                      category : category,
                      subcategory: subcategory})
  })
  
})

app.get('/store/category/:category/:subcategory', (req, res) => {
  user_session = req.session.user
  user_cart = null
  user_info = null
  if(user_session !== undefined){
    user_info = user_session[0]
    user_cart = user_session[1]
  }
  category = req.params.category
  subcategory = req.params.subcategory
  sql = "select *, price - (price * promotion / 100) new_price from products where category = ? and subcategory = ?   ORDER BY id DESC"
  connection.query(sql, [category, subcategory],function(err, rows, fields){
    if (err) throw err
    res.render('store', {user : user_info,
                        cart : user_cart,
                        products : rows,
                      category : category,
                    subcategory: subcategory})
  })
  
})

app.get('/store/hotdeals', (req, res) => {
  user_session = req.session.user
  user_cart = null
  user_info = null
  if(user_session !== undefined){
    user_info = user_session[0]
    user_cart = user_session[1]
  }
  category = req.params.category
  subcategory = req.params.subcategory

  sql = "select id, name, brand, image,  category, price, price - (price * promotion / 100) new_price, promotion,in_stock from products where promotion != 0 order by id desc"
    connection.query(sql, function(err, rows, fields, hotdeals){
      if(err) throw err
      hotdeals = rows
      //console.log(hotdeals)
      res.render('store', {user : user_info,
        cart : user_cart,
        products : hotdeals,
        category : [],
        subcategory: [],
        hotdeals: []})
    })
  
})

app.get('/store/product/:id', (req, res) => {
  user_session = req.session.user
  user_cart = null
  user_info = null
  if(user_session !== undefined){
    user_info = user_session[0]
    user_cart = user_session[1]
  }  
  id = req.params.id
  sql = "select *, price - (price * promotion / 100) new_price from products where id = ?"
  connection.query(sql, id,function(err, rows, fields){
    if (err) throw err
    product = rows[0]
    sql = "select * from reviews where product_id = ? ORDER BY id DESC"
    connection.query(sql, id, function(err, rows, fields){
      if(err) throw err
      reviews = rows
      
      res.render('product', {user : user_info, cart: user_cart,
                             product : product, 
                             reviews : reviews})
    })
  })
})

app.route('/cart')
.get( (req, res) => {
  user_session = req.session.user
  if(user_session !== undefined){
    user_info = user_session[0]
    user_cart = user_session[1]
    sql = "select product_id id, name, price, price - (price * promotion / 100) new_price, promotion, image, SUM(product_qnt) product_qnt from carts, users, products where users.id = ? and carts.user_id = users.id and carts.product_id = products.id GROUP BY carts.product_id"
    connection.query(sql, user_info.id, function(err, rows, fields){
      if(err) throw err
      req.session.user = [user_info, rows]
      console.log(req.session.user)
      res.render('cart', { user : user_info, cart : rows })
    })
  }else{
    req.flash('warning', 'You need to login')
    res.redirect('/login')
  }  
})
.post( (req, res, next) => {
  user_session = req.session.user
  //console.log(user_session)
  if(user_session !== undefined){
    product_qnt = (req.body.pqnt === undefined)? 1 : req.body.pqnt 
    cart = [parseInt(req.body.uid),parseInt(req.body.pid), product_qnt]
    sql = "insert into carts (user_id, product_id, product_qnt) values(?,?,?)"
    connection.query(sql, cart, function(err, rows, fields){
      if(err) throw err
      console.log("added", req.body.pid, req.body.uid)
      user_cart = user_session[1]
      user_cart.push({name:req.body.name, price : req.body.price, new_price: req.body.new_price, image: req.body.image, product_qnt: product_qnt})
      req.session.user = [user_session[0], user_cart]
      console.log(req.session.user)
      //console.log(user_cart)
      req.flash('success', 'Product added to cart')
      category = req.body.category
      res.redirect('/store/category/'+category)
    })
  }
  else{
    console.log("login first")
    req.flash('info', 'You need to Login first')
    res.redirect('/login')
  }
})

app.get('/cart/:id', (req, res) => {
  id = req.params.id
  sql = "delete from carts where product_id = ?"
  connection.query(sql, id, function(err, rows, fields){
    if(err) throw err
    res.redirect('/cart')
  })
})

app.route('/wishlist')
.get( (req, res) => {
  user_session = req.session.user
  if(user_session !== undefined){
    user_info = user_session[0]
    user_cart = user_session[1]
    sql = "select product_id id, name, price, price - (price * promotion / 100) new_price, category, promotion, image from wishs, users, products where users.id = ? and wishs.user_id = users.id and wishs.product_id = products.id GROUP BY wishs.product_id"
    connection.query(sql, user_info.id, function(err, rows, fields){
      if(err) throw err
      res.render('wishlist', { user : user_info, cart : user_cart, wishlist : rows })
    })
  }else{
    req.flash('warning', 'You need to login')
    res.redirect('/login')
  }  

})
.post( (req, res) => {

  user_session = req.session.user
  if(user_session !== undefined){
    user_info = user_session[0]
    user_cart = user_session[1]

    uid = user_info.id
    pid = req.body.pid
    sql = "select * from wishs where user_id = ? and product_id = ?"
    connection.query(sql, [uid, pid], function(err, rows, fields){
      if(err) throw err
      if(rows.length == 0){
        sql = "insert into wishs (user_id, product_id) values (?,?)"
          connection.query(sql, [uid, pid], function(err, rows, fields){
            if(err) throw err
            res.send({wish_status: "added"})
          })
        }
      else{  
        sql = "delete from wishs where user_id = ? and product_id = ?"
        connection.query(sql, [uid, pid], function(err, rows, fields){
          if(err) throw err
          res.send({wish_status: "deleted"})
        })
      }  
    })
  }
  else{
    res.send({wish_status: "login"})
  }   
})

app.get('/wishlist/:id', (req, res) => {
  id = req.params.id
  sql = "delete from wishs where product_id = ?"
  connection.query(sql, id, function(err, rows, fields){
    if(err) throw err
    res.redirect('/wishlist')
  })
})

app.get('/checkout', (req, res) => {
  user_session = req.session.user
  if(user_session !== undefined){
    user_info = user_session[0]
    user_cart = user_session[1]

    user_id = user_info.id
    sql = "select product_id, name, sum(product_qnt) product_qnt, price, price - (price * promotion / 100) new_price, promotion from carts, users, products where users.id = ? and carts.user_id = users.id and carts.product_id = products.id GROUP BY carts.product_id; "
    connection.query(sql, user_id, function(err, rows, fields){
      if(err) throw err
      //console.log(rows)
      res.render('checkout', {user : user_info, cart : user_cart, products : rows});
    })
  }else{
    req.flash('warning', 'You need to login')
    res.redirect('/login')
  }  
})

app.post('/checkout', (req, res) => {
  user_session = req.session.user
  user_info = user_session[0]
  user_cart = user_session[1]

  user_id = req.body.uid
  products = req.body.products
  firstname = req.body.firstname;lastname = req.body.lastname;fullname=firstname[0]+' '+lastname[0]
  email = req.body.email
  address = req.body.address
  city = req.body.city,
  zipcode = req.body.zipcode
  country = req.body.country; fulladdress = address[0]+', '+city[0]+' '+zipcode[0]+', '+country[0]
  phone = req.body.phone
  var today = new Date();
  var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
  var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
  var dateTime = date+' '+time;
  // console.log(user_id, products, fullname, email[0], fulladdress)
 
  // console.log(products.length)
  for(i=0; i< products.length; i++){
    console.log(products[0].price)
  }
  for(i=0; i< products.length; i++){
    // console.log(user_id, products[i].id, products[i].qnt, products[i].price, fullname, email[0], fulladdress, phone[0])
    record = [user_id, products[i].id, products[i].qnt, products[i].price, fullname, email[0], fulladdress, phone[0], dateTime]
    sql = "insert into orders (user_id, product_id, product_qnt, price, fullname, email, fulladdress, phone, date) values (?,?,?,?,?,?,?,?,?)"
    connection.query(sql, record, function(err, rows, fields){
      if(err) throw err
      return
    })
  }
  // console.log(l)

  for(i=0; i<products.length; i++){
    id = products[i].id
    sql = "UPDATE products SET sells = sells + 1 WHERE id = ?"
    connection.query(sql, id, function(err, rows, fields){
      if(err) throw err
      return
    })
  }

  for(i=0; i<products.length; i++){
    id = products[i].id
    sql = "UPDATE products SET in_stock = in_stock - 1 WHERE id = ?"
    connection.query(sql, id, function(err, rows, fields){
      if(err) throw err
      return
    })
  }

  sql = "delete from carts where user_id = ?"
  connection.query(sql, user_id, function(err, rows, fields){
    if(err) throw err
    req.session.user = [user_info, []]
    req.flash('success', 'products added to your order')
    res.redirect('/')
  })

})

app.post('/review', (req, res) => {
  product_id = req.body.pid
  username = req.body.name
  email = req.body.email
  review = req.body.review
  rating = req.body.rating
  var today = new Date();
  var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
  var time = today.getHours() + ":" + today.getMinutes();
  var dateTime = date+' '+time;

  console.log(product_id, username, email, review, parseInt(rating), dateTime)
  record = [product_id, username, email, review, rating, dateTime]

  sql = "insert into reviews (product_id, name, email, review, rating, date) values (?,?,?,?,?,?)"
  connection.query(sql, record, function(err, rows, fields){
    if(err) throw err
    req.session.user
    req.flash('success','your review was added')
    res.redirect('back')
  })
})

app.get('/orders', (req, res) => {
  user_session = req.session.user
  if(user_session !== undefined){
    user_info = user_session[0]
    user_cart = user_session[1]

    user_id = user_info.id
    sql = "select * from orders where user_id = ?"
    connection.query(sql, user_id, function(err, rows, fields){
      if(err) throw err
      //console.log(rows)
      res.send(rows)
      // res.render('orders', {user : user_info, cart : user_cart, orders : rows});
    })
  }else{
    req.flash('warning', 'You need to login')
    res.redirect('/login')
  }  
})


// ********************** ADMIN *****************************************************************

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})


function authenticate(name, pass, fn) {
    // if (!module.parent) console.log('authenticating %s:%s', name, pass);
    user = [name, pass]
    sql = "select * from users where username = ? and password = ?"
    connection.query(sql, user, function(err, rows, fields){
        if (err) throw err
        if (rows.length == 0){
        return fn(new Error('cannot find user'));}
        user = rows[0]
        // sql = "select name, price, image, product_qnt from carts, users, products where users.id = ? and carts.user_id = users.id and carts.product_id = products.id; "
        sql = "select product_id id, name, price, price - (price * promotion / 100) new_price,promotion, image, SUM(product_qnt) product_qnt from carts, users, products where users.id = ? and carts.user_id = users.id and carts.product_id = products.id GROUP BY carts.product_id "
        connection.query(sql, user.id, function(err, rows, fields){
          if (err) throw err
          user_cart = rows
          // console.log(user_cart)
          return fn(null, [user, user_cart])
        }) 

    })

  }

// run : npm start
