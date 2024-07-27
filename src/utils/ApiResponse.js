class ApiResponse {
    constructor(statusCode, data, message = "Success") {
        this.statusCode = statusCode,
            this.data = data,
            this.message = message,
            this.success = statusCode < 400  // less than 400 q ke ye response hai ko error nhi.


    }

}

export { ApiResponse }