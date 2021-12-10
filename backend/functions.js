module.exports = {
    getRequestTimestamp : function () {
    let date_time = new Date();
      // get current date
      // adjust 0 before single digit date
      let date = ("0" + date_time.getDate()).slice(-2);
      
      // get current month
      let month = ("0" + (date_time.getMonth() + 1)).slice(-2);
      
      // get current year
      let year = date_time.getFullYear();
      
      // get current hours
      let hours = date_time.getHours();
      
      // get current minutes
      let minutes = date_time.getMinutes();
      
      // get current seconds
      let seconds = date_time.getSeconds();
      let fullDate = year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;
      
      return fullDate;
    }
}