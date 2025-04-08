//go:build setup

package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/joho/godotenv"
	"github.com/okta/okta-sdk-golang/v5/okta"
)

const (
	hookdeckAPIVersion    = "2025-01-01"
	hookdeckAPIURLBase    = "https://api.hookdeck.com"
	connectionName        = "okta-to-cli-go-example" // Base name for the Hookdeck connection
	oktaSourceName        = "okta"
	cliDestName           = "hookdeck-cli"             // Default destination name if URL not provided
	httpDestName          = "my-http-endpoint"         // Default destination name if URL is provided
	oktaEventHookNameBase = "Hookdeck Go Example Hook" // Base name for the Okta hook
)

// --- Structs for Hookdeck API (PUT Connection) ---

type HookdeckInlineSource struct {
	Name   string                 `json:"name"`
	Type   string                 `json:"type"`
	Config map[string]interface{} `json:"config"`
}

type HookdeckInlineDestination struct {
	Name   string                 `json:"name"`
	Type   string                 `json:"type"`
	Config map[string]interface{} `json:"config"`
}

type HookdeckPutConnectionRequest struct {
	Name        string                    `json:"name"`
	Source      HookdeckInlineSource      `json:"source"`
	Destination HookdeckInlineDestination `json:"destination"`
}

// Response structure after PUT
type HookdeckConnection struct {
	ID          string              `json:"id"`
	Name        string              `json:"name"`
	Source      HookdeckSource      `json:"source"`
	Destination HookdeckDestination `json:"destination"`
}

// Full Source/Destination structs as returned in the response
type HookdeckSource struct {
	ID     string                 `json:"id"`
	Name   string                 `json:"name"`
	Type   string                 `json:"type"`
	Config map[string]interface{} `json:"config"`
	URL    string                 `json:"url"`
}

type HookdeckDestination struct {
	ID     string                 `json:"id"`
	Name   string                 `json:"name"`
	Type   string                 `json:"type"`
	Config map[string]interface{} `json:"config"`
}

// --- Helper Functions ---

func makeAPIRequest(method, urlStr, apiKey, bearerToken string, body io.Reader) (*http.Response, error) {
	req, err := http.NewRequest(method, urlStr, body)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	if apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+apiKey)
	} else if bearerToken != "" {
		req.Header.Set("Authorization", "SSWS "+bearerToken)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "hookdeck-go-quickstart-okta-setup")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}

	bodyBytes, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		log.Printf("Warning: failed to read response body during status check: %v", readErr)
	}
	resp.Body.Close()
	resp.Body = io.NopCloser(bytes.NewBuffer(bodyBytes)) // Restore body for potential reading by caller

	// Check status code AFTER restoring body
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return resp, fmt.Errorf("api request %s %s failed with status %d: %s", method, urlStr, resp.StatusCode, string(bodyBytes))
	}

	return resp, nil // Success case returns response and nil error
}

// setupOktaHookdeckIntegration performs the core logic of setting up the integration.
func setupOktaHookdeckIntegration(hookdeckAPIKey, oktaDomain, oktaAPIToken, webhookDestinationURL string) (*HookdeckConnection, *okta.EventHook, error) {
	// Generate a random webhook secret for Okta inbound webhook
	oktaWebhookSecretHeader := "x-webhook-key"
	oktaWebhookSecret := fmt.Sprintf("%x", make([]byte, 16))

	// Determine Okta Hook Name based on environment (presence of destination URL)
	var oktaEventHookNameToUse string
	if webhookDestinationURL != "" {
		oktaEventHookNameToUse = oktaEventHookNameBase + " - LIVE"
	} else {
		oktaEventHookNameToUse = oktaEventHookNameBase + " - DEV"
	}

	// Ensure oktaDomain has https:// prefix for the SDK
	if !strings.HasPrefix(oktaDomain, "https://") && !strings.HasPrefix(oktaDomain, "http://") {
		oktaDomain = "https://" + oktaDomain
	} else if strings.HasPrefix(oktaDomain, "http://") {
		log.Println("Warning: OKTA_DOMAIN starts with http://, changing to https:// for SDK compatibility.")
		oktaDomain = strings.Replace(oktaDomain, "http://", "https://", 1)
	}

	// --- Initialize Okta Client ---
	ctx := context.TODO()
	config, err := okta.NewConfiguration(
		okta.WithOrgUrl(oktaDomain),
		okta.WithToken(oktaAPIToken),
	)
	if err != nil {
		return nil, nil, fmt.Errorf("error creating Okta configuration: %w", err)
	}
	client := okta.NewAPIClient(config)
	if client == nil {
		return nil, nil, fmt.Errorf("failed to create Okta API client")
	}

	log.Printf("Starting Okta Event Hook setup using Hookdeck API version %s...", hookdeckAPIVersion)

	// --- Define Hookdeck Destination based on input ---
	var destination HookdeckInlineDestination
	if webhookDestinationURL != "" {
		log.Printf("Using provided WEBHOOK_DESTINATION_URL: %s", webhookDestinationURL)
		destination = HookdeckInlineDestination{
			Name:   httpDestName,
			Type:   "HTTP",
			Config: map[string]interface{}{"url": webhookDestinationURL},
		}
	} else {
		log.Println("WEBHOOK_DESTINATION_URL not set, using default CLI destination.")
		destination = HookdeckInlineDestination{
			Name:   cliDestName,
			Type:   "CLI",
			Config: map[string]interface{}{"path": "/"},
		}
	}

	// 1. Create/Update Hookdeck Connection idempotently via PUT /connections
	log.Printf("Creating/Updating Hookdeck Connection with name '%s'...", connectionName)
	hookdeckConnURL := fmt.Sprintf("%s/%s/connections", hookdeckAPIURLBase, hookdeckAPIVersion)

	connReqPayload := HookdeckPutConnectionRequest{
		Name: connectionName,
		Source: HookdeckInlineSource{
			Name: oktaSourceName,
			Type: "WEBHOOK",
			Config: map[string]interface{}{
				"auth_type": "API_KEY",
				"auth": map[string]interface{}{
					"header_key": oktaWebhookSecretHeader,
					"api_key":    oktaWebhookSecret,
				},
			},
		},
		Destination: destination,
	}

	connReqBody, err := json.MarshalIndent(connReqPayload, "", "  ")
	if err != nil {
		return nil, nil, fmt.Errorf("error marshalling Hookdeck connection request: %w", err)
	}
	log.Printf("Hookdeck Connection Request Payload:\n%s\n", string(connReqBody))

	connResp, err := makeAPIRequest("PUT", hookdeckConnURL, hookdeckAPIKey, "", bytes.NewBuffer(connReqBody))
	if err != nil {
		return nil, nil, fmt.Errorf("error creating/updating Hookdeck connection: %w", err)
	}
	defer connResp.Body.Close()

	var upsertedConn HookdeckConnection
	if err := json.NewDecoder(connResp.Body).Decode(&upsertedConn); err != nil {
		connResp.Body = io.NopCloser(bytes.NewBuffer([]byte{})) // Reset reader to attempt reading body for logging
		bodyBytes, _ := io.ReadAll(connResp.Body)
		return nil, nil, fmt.Errorf("error decoding Hookdeck connection response: %w. Body: %s", err, string(bodyBytes))
	}
	log.Printf("Successfully upserted Hookdeck Connection (Name: %s, ID: %s)\n", upsertedConn.Name, upsertedConn.ID)
	log.Printf("Hookdeck Source URL (for Okta): %s\n", upsertedConn.Source.URL)

	// 2. Create or Update Okta Event Hook using SDK
	log.Printf("Attempting to create/update Okta Event Hook '%s' using SDK...", oktaEventHookNameToUse)

	// Define the Event Hook using SDK types
	stringPtr := func(s string) *string { return &s }
	authSchemeType := "HEADER"
	hookStatus := "ACTIVE"

	eventHook := okta.EventHook{
		Name: oktaEventHookNameToUse,
		Events: okta.EventSubscriptions{
			Type:  "EVENT_TYPE",
			Items: []string{"user.lifecycle.create"},
		},
		Channel: okta.EventHookChannel{
			Type:    "HTTP",
			Version: "1.0.0",
			Config: okta.EventHookChannelConfig{
				Uri:     upsertedConn.Source.URL,
				Headers: []okta.EventHookChannelConfigHeader{},
				AuthScheme: &okta.EventHookChannelConfigAuthScheme{
					Type:  stringPtr(authSchemeType),
					Key:   stringPtr(oktaWebhookSecretHeader),
					Value: stringPtr(oktaWebhookSecret),
				},
			},
		},
		Status: stringPtr(hookStatus),
	}

	var finalEventHook *okta.EventHook
	var oktaResp *okta.APIResponse
	var oktaErr error

	// Try to create the hook
	finalEventHook, oktaResp, oktaErr = client.EventHookAPI.CreateEventHook(ctx).EventHook(eventHook).Execute()

	if oktaErr != nil {
		// Check if it failed because it already exists (Okta API returns 400 for this)
		if oktaResp != nil && oktaResp.Response != nil && oktaResp.Response.StatusCode == 400 {
			log.Printf("Create failed (Status %d), possibly because '%s' already exists. Attempting to find and update...", oktaResp.Response.StatusCode, oktaEventHookNameToUse)

			// Fetch all hooks and filter manually
			hooks, listResp, listErr := client.EventHookAPI.ListEventHooks(ctx).Execute()

			if listErr != nil {
				statusCode := 0
				if listResp != nil && listResp.Response != nil {
					statusCode = listResp.Response.StatusCode
				}
				return nil, nil, fmt.Errorf("error listing Okta Event Hooks: %v (Response Status: %d)", listErr, statusCode)
			}

			// Manual filtering after fetching all hooks
			var existingHook *okta.EventHook
			foundHooks := []*okta.EventHook{}
			for _, hook := range hooks {
				if hook.Name == oktaEventHookNameToUse {
					foundHooks = append(foundHooks, &hook)
				}
			}

			if len(foundHooks) == 0 {
				return nil, nil, fmt.Errorf("create failed, but could not find existing Okta Event Hook with name '%s'. Original create error: %v", oktaEventHookNameToUse, oktaErr)
			} else if len(foundHooks) > 1 {
				log.Printf("Warning: Found multiple Okta Event Hooks with name '%s'. Replacing the first one found (ID: %s).", oktaEventHookNameToUse, *foundHooks[0].Id)
				existingHook = foundHooks[0]
			} else { // Exactly one found
				existingHook = foundHooks[0]
			}

			// Proceed with update if a single hook was found or selected
			if existingHook != nil && existingHook.Id != nil {
				log.Printf("Found existing hook with ID: %s. Attempting to replace...", *existingHook.Id)

				// Update the existing hook
				hookStatusActive := "ACTIVE"
				eventHook.Status = stringPtr(hookStatusActive)
				finalEventHook, oktaResp, oktaErr = client.EventHookAPI.ReplaceEventHook(ctx, *existingHook.Id).EventHook(eventHook).Execute()
				if oktaErr != nil {
					statusCode := 0
					if oktaResp != nil && oktaResp.Response != nil {
						statusCode = oktaResp.Response.StatusCode
					}
					return nil, nil, fmt.Errorf("error replacing (PUT) Okta Event Hook '%s' (ID: %s): %v (Response Status: %d)", oktaEventHookNameToUse, *existingHook.Id, oktaErr, statusCode)
				}

				finalName := finalEventHook.Name
				finalId := "N/A"
				if finalEventHook.Id != nil {
					finalId = *finalEventHook.Id
				}
				finalStatusValue := "N/A"
				if finalEventHook.Status != nil {
					finalStatusValue = *finalEventHook.Status
				}
				log.Printf("Successfully replaced (PUT) Okta Event Hook '%s' (ID: %s, Status: %s)\n", finalName, finalId, finalStatusValue)
			} else if existingHook != nil && (existingHook.Id == nil || *existingHook.Id == "") {
				log.Printf("Found existing hook named '%s' but it has no ID. Cannot replace.", oktaEventHookNameToUse)
				// Note: Depending on requirements, you might want to return an error here.
				// return nil, nil, fmt.Errorf("found existing hook named '%s' but it has no ID", oktaEventHookNameToUse)
			}
		} else {
			// It was a different error during create
			statusCode := 0 // Default status code if oktaResp is nil
			if oktaResp != nil && oktaResp.Response != nil {
				statusCode = oktaResp.Response.StatusCode
			}
			return nil, nil, fmt.Errorf("error creating (POST) Okta Event Hook using SDK: %v (Response Status: %d)", oktaErr, statusCode)
		}
	} else {
		finalName := finalEventHook.Name
		finalId := "N/A"
		if finalEventHook.Id != nil {
			finalId = *finalEventHook.Id
		}
		finalStatusValue := "N/A"
		if finalEventHook.Status != nil {
			finalStatusValue = *finalEventHook.Status
		}
		log.Printf("Successfully created (POST) Okta Event Hook '%s' (ID: %s, Status: %s)\n", finalName, finalId, finalStatusValue)
	}

	// --- Verification and Activation (Run after successful POST or PUT) ---
	if finalEventHook == nil || finalEventHook.Id == nil || *finalEventHook.Id == "" {
		return nil, nil, fmt.Errorf("failed to get Okta Event Hook details after create/update")
	}

	// 3. Attempt verification using SDK
	log.Printf("Attempting to verify Okta Event Hook '%s' (ID: %s) using SDK...", finalEventHook.Name, *finalEventHook.Id)
	verifiedHook, verifyResp, verifyErr := client.EventHookAPI.VerifyEventHook(ctx, *finalEventHook.Id).Execute()
	if verifyErr != nil {
		statusCode := 0 // Default status code if verifyResp is nil
		if verifyResp != nil && verifyResp.Response != nil {
			statusCode = verifyResp.Response.StatusCode
		}
		// Verification failure is often okay (e.g., already verified), log as warning
		log.Printf("Warning: Okta Event Hook verification call failed (Status: %d): %v. This might be okay if already verified.", statusCode, verifyErr)
		// Keep the status from the create/update operation if verification fails
	} else {
		verifiedName := verifiedHook.Name
		verifiedStatusValue := "N/A"
		if verifiedHook.Status != nil {
			verifiedStatusValue = *verifiedHook.Status
		}
		log.Printf("Okta Event Hook '%s' verification call succeeded. Current Status: %s\n", verifiedName, verifiedStatusValue)
		finalEventHook = verifiedHook
	}

	log.Println("Setup complete!")
	return &upsertedConn, finalEventHook, nil
}

// --- Main Entry Point ---

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, loading environment variables from OS.")
	}

	hookdeckAPIKey := os.Getenv("HOOKDECK_API_KEY")
	oktaDomain := os.Getenv("OKTA_DOMAIN")
	oktaAPIToken := os.Getenv("OKTA_API_TOKEN")
	webhookDestinationURL := os.Getenv("WEBHOOK_DESTINATION_URL") // Read the optional destination URL

	// Validate required environment variables
	if hookdeckAPIKey == "" {
		log.Fatal("Error: Required environment variable HOOKDECK_API_KEY must be set.")
	}
	if oktaDomain == "" || oktaAPIToken == "" {
		log.Fatal("Error: Required environment variables OKTA_DOMAIN and OKTA_API_TOKEN must be set for Okta setup.")
	}

	// Call the core setup logic function, passing the destination URL
	upsertedConn, finalEventHook, err := setupOktaHookdeckIntegration(hookdeckAPIKey, oktaDomain, oktaAPIToken, webhookDestinationURL)
	if err != nil {
		log.Fatalf("Setup failed: %v", err)
	}

	// --- Print Summary ---
	fmt.Println("\n--- Summary ---")
	if upsertedConn != nil {
		fmt.Printf("Hookdeck Connection: (Name: %s, ID: %s)\n", upsertedConn.Name, upsertedConn.ID)
		fmt.Printf("  - Source: '%s' (Type: %s)\n", upsertedConn.Source.Name, upsertedConn.Source.Type)
		fmt.Printf("  - Destination: '%s' (Type: %s)\n", upsertedConn.Destination.Name, upsertedConn.Destination.Type)
		fmt.Printf("  - Source URL (for Okta): %s\n", upsertedConn.Source.URL)
	} else {
		fmt.Println("Hookdeck Connection: Not created/retrieved.")
	}

	if finalEventHook != nil {
		finalName := finalEventHook.Name
		finalId := "N/A"
		if finalEventHook.Id != nil {
			finalId = *finalEventHook.Id
		}
		finalStatusValue := "N/A"
		if finalEventHook.Status != nil {
			finalStatusValue = *finalEventHook.Status
		}
		fmt.Printf("Okta Event Hook: '%s' (ID: %s, Status: %s) (points or should point to the URL above)\n", finalName, finalId, finalStatusValue)
	} else {
		fmt.Println("Okta Event Hook: Not created/retrieved.")
	}

	// Removed informational messages about env vars and re-running setup.
	fmt.Println("After setup, run 'go run main.go' (with HOOKDECK_WEBHOOK_SECRET set) and 'hookdeck listen' to receive events.")
}
