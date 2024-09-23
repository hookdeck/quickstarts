package main

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func verifyPayload(jsonBody string, headers http.Header) bool {
	secret := os.Getenv("HOOKDECK_WEBHOOK_SECRET")
	if secret == "" {
		log.Println("No HOOKDECK_WEBHOOK_SECRET found in environment variables. Skipping verification.")
		return true
	}

	hmacHeader := headers.Get("x-hookdeck-signature")
	hmacHeader2 := headers.Get("x-hookdeck-signature-2")

	hash := hmac.New(sha256.New, []byte(secret))
	hash.Write([]byte(jsonBody))
	expectedHash := base64.StdEncoding.EncodeToString(hash.Sum(nil))

	if expectedHash == hmacHeader ||
		(hmacHeader2 != "" && expectedHash == hmacHeader2) {
		return true
	}

	return false
}

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

		verified := verifyPayload(jsonBody, c.Request.Header)

		if !verified {
			c.JSON(http.StatusUnauthorized, gin.H{
				"message": "invalid payload",
			})
			return
		}

		var prettyJSON bytes.Buffer
		if err := json.Indent(&prettyJSON, []byte(jsonBody), "", "  "); err != nil {
			log.Printf("Failed to format JSON: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "failed to format JSON",
			})
			return
		}
		log.Printf("webhook_received: %v", prettyJSON.String())

		c.JSON(http.StatusOK, gin.H{
			"status": "ACCEPTED",
		})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "3032"
	}

	fmt.Printf("🪝 Server running at http://localhost:%s", port)
	r.Run(fmt.Sprintf(":%s", port))
}
