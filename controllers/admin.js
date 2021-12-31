const express = require('express')
const mysql = require('mysql')
const session = require('express-session');
var flash = require('connect-flash')
var messages = require('express-messages')
const app = express()
app.use('/public', express.static('public'));
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
var router = express.Router()

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

router.get('/', (req, res) => {
    user_session = req.session.user
    if(user_session !== undefined){

        user_info = user_session[0]

        if(user_info.is_admin === 1){
        sql = "select count(*) total from products"
        connection.query(sql, function(err, rows, fields){
            if(err) throw err
            total_products = rows[0].total
    
            sql = "select count(DISTINCT date) total from orders where status='pending' order by date"
            connection.query(sql, function(err, rows, fields){
                if(err) throw err
                total_orders = rows[0].total
    
                sql = "select count(*) total from users where is_admin = 0"
                connection.query(sql, function(err, rows, fields){
                    if(err) throw err
                    total_users = rows[0].total
    
                    sql = "select sum(price) total from orders where status = 'confirmed' "
                    connection.query(sql, function(err, rows, fields){
                        if(err) throw err
                        total_sales = rows[0].total

                        res.render('admin/dashboard', {user : user_info, total_products:total_products, total_users:total_users, total_orders:total_orders,total_sales:total_sales})
                    })
    
                })
            })
    
        })
        }
        else{
            req.flash('danger', 'you dont have permission')
            res.redirect('/login')
        }
    }else{
        req.flash('warning', 'You need to login')
        res.redirect('/login')
    }
})

router.get('/product', (req, res) => {
    user_session = req.session.user
    if(user_session !== undefined){

        user_info = user_session[0]
        if(user_info.is_admin === 1)
            res.render('admin/add_product', {user : user_info})
        else{
            req.flash('danger', 'you dont have permission')
            res.redirect('/login')
        }
    }else{
        req.flash('warning', 'You need to login')
        res.redirect('/login')
    }

})

router.post('/product', (req, res) => {

    user_session = req.session.user
    if(user_session !== undefined){

        user_info = user_session[0]
        if(user_info.is_admin === 1){
            pname = req.body.name
            category = req.body.category
            subcategory = req.body.subcategory
            brand = req.body.brand
            price = req.body.price
            in_stock = req.body.in_stock
            image = req.body.image
            image = subcategory+'/'+image
            sound = req.body.sound
            if(sound !== '')
                sound = subcategory+'/'+sound
            video = req.body.video
            description = req.body.description
        
            product = [pname, price, image, category, subcategory, brand, sound, video, 0, 0, in_stock, description]
            console.log(product)
            sql = "select * from products where name = ?"
            connection.query(sql, pname,function (err, rows, fields){
                if(err) throw err
                if(rows>0){
                    req.flash('danger','product already exist')
                    res.redirect('/admin/products')
                }else{
                    sql = "insert into products (name, price, image, category, subcategory, brand, sound, video, sells, promotion, in_stock, description) values (?,?,?,?,?,?,?,?,?,?,?,?);"
                    connection.query(sql, product,function (err, rows, fields){
                        if(err) throw err
                        req.flash('success', 'product added')
                        res.redirect('/admin/products')
        
                    })
                }
            })
        }
        else{
            req.flash('danger', 'you dont have permission')
            res.redirect('/login')
        }
    }else{
        req.flash('warning', 'You need to login')
        res.redirect('/login')
    }


    

})

router.get('/product/:id', (req, res) => {
    
    user_session = req.session.user
    if(user_session !== undefined){
        user_info = user_session[0]
        if(user_info.is_admin === 1){
           id = req.params.id
           sql = "select * from products where id = ?"
           connection.query(sql, id, function(err, rows, fields){
               if(err) throw err
               
               if(rows.length > 0)
                res.render('admin/update_product', {user : user_info, product : rows[0]})
           })
        }
        else{
            req.flash('danger', 'you dont have permission')
            res.redirect('/login')
        }
    }else{
        req.flash('warning', 'You need to login')
        res.redirect('/login')
    }

    
})

router.post('/product/:id', (req, res) => {
    
    user_session = req.session.user
    if(user_session !== undefined){
        user_info = user_session[0]
        if(user_info.is_admin === 1){
            pid = req.params.id
            pname = req.body.name
            category = req.body.category
            subcategory = req.body.subcategory
            price = req.body.price
            promo = req.body.promo 
            in_stock = req.body.in_stock
            brand = req.body.brand 
            image = req.body.image
            sound = req.body.sound
            video = req.body.video
            desc = req.body.description
            o_image = req.body.o_image
            o_sound = req.body.o_sound
            if(image=="") image = o_image
            if(sound=="") sound = o_sound
            record = [pname,price, image, category, subcategory, brand, sound, video,promo, in_stock, desc, pid] 

            sql = "UPDATE `products` SET `name`=?,`price`=?,`image`=?,`category`=?,`subcategory`=?,`brand`=?,`sound`=?,`video`=?,`promotion`=?,`in_stock`=?,`description`=? WHERE id = ?"
            connection.query(sql, record, function(err, rows, fields){
                if(err) throw err
                req.flash("success", "product updated")
                res.redirect("/admin/products")
            })
        }
        else{
            req.flash('danger', 'you dont have permission')
            res.redirect('/login')
        }
    }else{
        req.flash('warning', 'You need to login')
        res.redirect('/login')
    }

    
})

// router.delete('/product/:id', (req, res) => {
//     console.log(req.params.id)
//     res.send({text: "delete"})
// })

router.delete('/product/:id', (req, res) => {
    user_session = req.session.user
    if(user_session !== undefined){
        user_info = user_session[0]
        if(user_info.is_admin === 1){
           id = req.params.id
           sql = "select count(product_id) total from orders where product_id = ?"
           connection.query(sql, id, function(err, rows, fields){
               if(err) throw err
               if(rows[0].total>0){
                   req.flash("danger", "product in orders, can't delete")
                    res.send({text:"error"})

               }else{
                   sql = "delete from products where id = ?"
                   connection.query(sql, id, function(err, rows, fields){
                        if(err) throw err
                        res.send({text:"deleted"})
                    })
                }
           })
        }
        else{
            req.flash('danger', 'you dont have permission')
            res.redirect('/login')
        }
    }else{
        req.flash('warning', 'You need to login')
        res.redirect('/login')
    }

})

router.get('/products', (req, res) => {
    user_session = req.session.user
    if(user_session !== undefined){

        user_info = user_session[0]
        if(user_info.is_admin === 1){
            sql = "select * from products"
            connection.query(sql, function(err, rows, field){
                if(err) throw err
                // res.send(rows)
                res.render('admin/products', {user : user_info, products : rows})
            })
        }else{
            req.flash('danger', 'you dont have permission')
            res.redirect('/login')
        }
    }else{
        req.flash('warning', 'You need to login')
        res.redirect('/login')
    }
})

router.get('/users', (req, res) => {
    user_session = req.session.user
    if(user_session !== undefined){

        user_info = user_session[0]
        if(user_info.is_admin === 1){
            sql = "select * from users where is_admin = 0"
            connection.query(sql, function(err, rows, field){
                if(err) throw err
                // res.send(rows)
                res.render('admin/users', {user : user_info, users : rows})
            })
        }else{
            req.flash('danger', 'you dont have permission')
            res.redirect('/login')
        }
    }else{
        req.flash('warning', 'You need to login')
        res.redirect('/login')
    }
})

router.post('/user/:id', (req, res) => {
    user_session = req.session.user
    if(user_session !== undefined){
        user_info = user_session[0]
        if(user_info.is_admin === 1){
            id = req.params.id
            sql = "delete from users where id = ?"
            connection.query(sql, id, function(err, rows, fields){
                if(err) throw err
                sql = "delete from wishs where user_id = ?"
                connection.query(sql, id, function(err, rows, fields){
                    if(err) throw err
                    sql = "delete from orders where user_id = ?"
                    connection.query(sql, id, function(err, rows, fields){
                        if(err) throw err
                        sql = "delete from carts where user_id = ?"
                        connection.query(sql, id, function(err, rows, fields){
                            if(err) throw err
                            req.flash("success", "user deleted")
                            res.redirect("/admin/users")   
                        })    
                    })
                })
            })
            
        }
        else{
            req.flash('danger', 'you dont have permission')
            res.redirect('/login')
        }
    }else{
        req.flash('warning', 'You need to login')
        res.redirect('/login')
    }    
})

router.get('/orders', (req, res) => {
    user_session = req.session.user
    if(user_session !== undefined){

        user_info = user_session[0]
        if(user_info.is_admin === 1){
            sql = `SELECT username, product_qnt, orders.price, orders.email,fullname, fulladdress, orders.phone, date, status, name, image FROM orders, users, products 
            where
            users.id = user_id AND
            products.id = product_id AND
            status = 'pending' ORDER BY date `

            connection.query(sql, function(err, rows, field){
                if(err) throw err
                orders = rows

                sql = "select DISTINCT date from orders where status='pending' order by date"
                connection.query(sql, function(err, rows, fields){
                    if(err) throw err
                    total_orders = rows
                    dates = []
                    for(i=0; i<total_orders.length; i++){
                        dates.push(rows[i].date)
                    }

                    new_orders = []
                    for(i = 0; i < dates.length; i++){
                        elmnts = []
                        for(y = 0; y < orders.length; y++){
                            if(dates[i] == orders[y].date){
                                elmnt = orders[y]
                                elmnts.push(elmnt)
                            }
                        }
                        new_orders.push(elmnts)
                    }
                    console.log(new_orders)
                    res.render('admin/orders', {user : user_info, orders : new_orders} )
                })                
            })
        }else{
            req.flash('danger', 'you dont have permission')
            res.redirect('/login')
        }
    }else{
        req.flash('warning', 'You need to login')
        res.redirect('/login')
    }
})

router.post('/order', (req, res) => {
    user_session = req.session.user
    if(user_session !== undefined){

        user_info = user_session[0]
        if(user_info.is_admin === 1){
            date = req.body.date
            sql = "update orders set status = 'confirmed' where date = ?"
            connection.query(sql, date, function(err, rows, fields){
                if(err) throw err
                req.flash("success", "order confirmed")
                res.redirect("/admin/orders")
            })
        }else{
            req.flash('danger', 'you dont have permission')
            res.redirect('/login')
        }
    }else{
        req.flash('warning', 'You need to login')
        res.redirect('/login')
    }
} )

module.exports = router