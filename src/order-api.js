const express = require('express');
const router = express.Router();
const axios = require('axios');
const config = require('./config/config')
module.exports = (function () {
    function createBasicAuthHeader(username, password) {
        const token = Buffer.from(`${username}:${password}`).toString('base64');
        return `Basic ${token}`;
    }
    // Lấy access_token
    async function get_access_token() {
        try {
            const response = await axios.post('https://open.larksuite.com/open-apis/auth/v3/app_access_token/internal', {
                app_id: "cli_a6e6b7d475b8902f",
                app_secret: "tupej3VZjXsZJUNdoMvprYZmuARFQtjU"
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            console.log("Access token retrieved:", response.data.app_access_token);
            return response.data.app_access_token;
        } catch (err) {
            console.error("Error getting access token: ", err);
            throw new Error("Unable to get access token");
        }
    }

    // Lấy danh sách order
    async function get_list_order() {
        try {
            const response = await axios.get(`${config.wooCommerceUrl}/wp-json/myplugin/v1/orders`, {
                params: { fields: "id, date, total, customer_name, status" }
            });
            return response.data;
        } catch (err) {
            console.error("Error getting list orders: ", err);
            throw new Error("Unable to get list orders");
        }
    }
	router.get('/list_order', async(req,res)=>{
		try {
            const response = await get_list_order();
            res.send(response.data);
        } catch (err) {
            console.error("Error getting list orders: ", err);
            throw new Error("Unable to get list orders");
        }
	})
    //Lấy ra order mới nhất
    async function get_order(){
        try{
            const response = await axios.get(`${config.wooCommerceUrl}/wp-json/myplugin/v1/latest-order`,{
                params: { fields: "id, date, total, customer_name, status" }

            });
            return response.data;
        }catch(err){
            console.error("Error getting  order: ", err);
        }
    }
    // Tạo bản ghi mới
    async function create_record(fields, access_token) {
        try {
            const response = await axios.post(
                "https://open.larksuite.com/open-apis/bitable/v1/apps/VY5Db3XasahyrLsbB1oljHYAg1e/tables/tblbin4RuHqK3lvH/records",
                { fields: fields },
                {
                    headers: {
                        'Authorization': `Bearer ${access_token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log(response.data);
        } catch (err) {
            console.error("Error creating record:", err.response ? err.response.data : err.message);
        }
    }
    // Chuyển đổi định dạng ngày
    function formatDate(dateString) {
        const date = new Date(dateString);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');

		// Dạng YYYY/MM/DD HH:MM
		const formattedDate = `${year}/${month}/${day} ${hours}:${minutes}`;

		return formattedDate;
    }
    router.post('/order_lark', async (req,res)=>{
        try{
            const order = await get_order();
            const access_token = await get_access_token();
            const date = formatDate(order.date);
            const fields = {
                
                "id": String(order.id),
                "name": String(order.customer_name),
                "total": String(order.total),
                "status": String(order.status),
                // "date": date
            };
            console.log("Data to be sent to Lark Suite:", fields);
            await create_record(fields, access_token);
            res.send("DONE!");
        }catch(err){
            res.send("Error: "+err);
        }
    })
    router.post('/list_order', async (req, res) => {
        try {
            const list_order = await get_list_order();
            const access_token = await get_access_token();
    
            for (const order of list_order) {
                // const date = formatDate(order.date);
    
                const fields = {
                    "id": String(order.id),
                    "name": String(order.customer_name),
                    "total": String(order.total),
                    "status": String(order.status),
                    // "date": date,
                };
    
                console.log("Data to be sent to Lark Suite:", fields);
    
                await create_record(fields, access_token);
            }
            res.send("DONE!");
        } catch (err) {
            console.error("Error:", err);
            res.status(500).send("Error: " + err.message);
        }
    });  

    // api webhook từ lark
    router.post('/order_woocommerce', async(req, res)=>{
        try{
            const {id, name, total, status , date} = req.body;
            console.log(req.body);
            const fields = {id,name,total,status,date};
            console.log("Received webhook: "+JSON.stringify(fields));
            await create_order_webhook(fields);
            res.send("DONE!");
        }catch(err){
            res.send("web hook : "+ err.message);
        }
    })
    async function create_order_webhook(fields){
        try{
            const authHeader = createBasicAuthHeader (config.consumerKey, config.consumerSecret);
            const response = await axios.post(
                `${config.wooCommerceUrl}/wp-json/myplugin/v1/order`,
                fields
                ,{
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': authHeader
                    }
                }
            )
            console.log(response.data);
        }catch(err){
            console.error("Error create order webhook: " + err.message);
        }
    }
      // Route để nhận webhook thay đổi order từ Lark
      router.put('/update_order', async (req, res)=> {
        try {
          const { id, status } = req.body;
          console.log(`Received webhook with order ID: ${id} and status: ${status}`);
          await updateOrderStatus(id, status); // Gọi hàm updateOrderStatus với status được gửi dưới dạng object
          res.status(200).send('Webhook received');
        } catch (err) {
          console.error("Error handling Lark webhook:", err);
          res.status(500).send("Error: " + err.message);
        }
      });

      
	  // Cập nhật trạng thái đơn hàng trong WooCommerce
	  async function updateOrderStatus(orderId, status) {
		try {
            console.log(1);
            console.log("Bắt đầu cập nhật trạng thái đơn hàng", orderId);
            const authHeader = createBasicAuthHeader(config.consumerKey, config.consumerSecret);

            const response = await axios.put(
                `${config.wooCommerceUrl}/wp-json/myplugin/v1/orders/${orderId}`,
                { status: status },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': authHeader
                    }
                }
             );
            console.log(2);
            console.log(response.data);
            console.log(`Order ${orderId} status updated to ${status} in WooCommerce`);
		} catch (err) {
		  console.error("Error updating order status in WooCommerce:", err.response ? err.response.data : err.message);
		}
	  }
      async function get_count_order_time(fields) {
        try {
            const response = await axios.get(`${config.wooCommerceUrl}/wp-json/myplugin/v1/order-count`, {
                params: {
                    start_date: fields.start_date,
                    end_date: fields.end_date
                }
            });
            const data = response.data;
            return data;
        } catch (err) {
            console.error("Error get count order: ", err.message);
        }
    }
    //api lấy ra số lượng đơn hàng theo time
    router.get("/count_order", async (req, res) => {
        try {
            const { start_date, end_date } = req.query;
            const fields = { start_date, end_date };
            const data = await get_count_order_time(fields);
            res.status(200).send(data);
        } catch (err) {
            console.error("Error API count: ", err.message);
            res.status(400).send(err.message);
        }
    });

    async function get_count_customer_time(files) {
        try {
            const response = await axios.get(`${config.wooCommerceUrl}/wp-json/myplugin/v1/customer-count`, {
                params: {
                    start_date: fields.start_date,
                    end_date: fields.end_date
                }
            });
            const data = response.data;
            return data;
        } catch (err) {
            console.error("Error get count order: ", err.message);
        }
    }
    router.get("/count_customer", async (req, res) => {
        try {
            const { start_date, end_date } = req.query;
            const fields = { start_date, end_date };
            const data = await get_count_customer_time(fields);
            res.status(200).send(data);
        } catch (err) {
            console.error("Error API count: ", err.message);
            res.status(400).send(err.message);
        }
    });
    return router; 
})();
