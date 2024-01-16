package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()
	r.POST("/*path", func(c *gin.Context) {
		bodyAsByteArray, err := io.ReadAll(c.Request.Body)
		jsonBody := string(bodyAsByteArray)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "could not get request body data",
			})
			return
		}

		log.Printf("webhook_received: %v", jsonBody)

		c.JSON(http.StatusOK, gin.H{
			"status": "ACCEPTED",
		})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "3030"
	}

	fmt.Printf("🪝 Server running at http://localhost:%s", port)
	r.Run(fmt.Sprintf(":%s", port))
}
