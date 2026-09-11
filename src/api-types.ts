export interface paths {
    "/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Health check (legacy) */
        get: operations["health_health_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Health check (versioned) */
        get: operations["health_v1_health_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Rotate our access+refresh JWT pair */
        post: operations["refresh_v1_auth_refresh_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get current user (claims from OIDC ID token + DB state) */
        get: operations["me_v1_auth_me_get"];
        put?: never;
        post?: never;
        /** Delete current user (hard delete) */
        delete: operations["delete_me_v1_auth_me_delete"];
        options?: never;
        head?: never;
        /** Update current user locale (name/email come from OIDC ID token) */
        patch: operations["update_me_v1_auth_me_patch"];
        trace?: never;
    };
    "/v1/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** RP-initiated OIDC logout — returns URL to redirect the browser to Authentik end_session_endpoint */
        post: operations["logout_v1_auth_logout_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/oidc/start": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Begin OIDC Authorization Code + PKCE flow (302 to Authentik) */
        get: operations["oidc_start_v1_auth_oidc_start_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/oidc/callback": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** OIDC redirect_uri — exchanges code for tokens, provisions user, sets cookie, redirects to /auth/complete */
        get: operations["oidc_callback_v1_auth_oidc_callback_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/oidc/complete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Frontend calls this on /auth/complete to read the one-shot cookie and get tokens */
        post: operations["oidc_complete_v1_auth_oidc_complete_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/api-keys": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List API keys (without secret) */
        get: operations["list_api_keys_v1_api_keys_get"];
        put?: never;
        /** Create API key (returns full key once) */
        post: operations["create_api_key_v1_api_keys_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/api-keys/{key_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Revoke API key (soft delete) */
        delete: operations["delete_api_key_v1_api_keys__key_id__delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/connectors": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List connectors */
        get: operations["list_connectors_v1_connectors_get"];
        put?: never;
        /**
         * Create schema-only connector
         * @description EZSQL-37: connectors store only schema metadata. No DB credentials are accepted and the API never connects to or executes against a customer database. A client-side runtime (WordPress plugin / SDK / CLI) introspects its own database and pushes the resulting schema here. The web app only lists connectors.
         */
        post: operations["create_connector_v1_connectors_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/connectors/{connector_id}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                connector_id: string;
            };
            cookie?: never;
        };
        /** Get connector */
        get: operations["get_connector_v1_connectors__connector_id__get"];
        put?: never;
        post?: never;
        /** Delete connector */
        delete: operations["delete_connector_v1_connectors__connector_id__delete"];
        options?: never;
        head?: never;
        /** Update connector */
        patch: operations["update_connector_v1_connectors__connector_id__patch"];
        trace?: never;
    };
    "/v1/connectors/{connector_id}/sync": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                connector_id: string;
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Push schema from client (refresh)
         * @description EZSQL-37: the client-side runtime introspects its own database and POSTs the fresh schema. The API does not open any database connection.
         */
        post: operations["sync_connector_v1_connectors__connector_id__sync_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/connectors/{connector_id}/schema": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                connector_id: string;
            };
            cookie?: never;
        };
        /** Get cached schema */
        get: operations["get_connector_schema_v1_connectors__connector_id__schema_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/connectors/{connector_id}/suggestions": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                connector_id: string;
            };
            cookie?: never;
        };
        /** LLM-generated Portuguese business questions */
        get: operations["get_suggestions_v1_connectors__connector_id__suggestions_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/connectors/{connector_id}/autocomplete": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                connector_id: string;
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** LLM autocomplete for partial question */
        post: operations["autocomplete_v1_connectors__connector_id__autocomplete_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/queries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Paginated query history */
        get: operations["list_queries_v1_queries_get"];
        put?: never;
        /**
         * Ask question (generate SQL only — client executes)
         * @description EZSQL-37: the API NEVER executes queries server-side. It generates + validates SQL from the connector's cached schema, persists the question, and returns `needs_local_execution: true`. A client-side runtime executes the SQL locally and POSTs the result to /v1/queries/{id}/answer. Requires API key authentication (JWT → 403) because questions are only asked by external connector runtimes, not the web app.
         */
        post: operations["create_query_v1_queries_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/queries/{query_id}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                query_id: string;
            };
            cookie?: never;
        };
        /** Get query detail (poll this to wait for status=ready) */
        get: operations["get_query_v1_queries__query_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/queries/{query_id}/answer": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                query_id: string;
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** WP plugin submits locally-executed result (API key only) */
        post: operations["answer_query_v1_queries__query_id__answer_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/queries/{query_id}/stream": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                query_id: string;
            };
            cookie?: never;
        };
        /** SSE stream — emits QueryResponse every 500ms until ready/failed or 60s timeout */
        get: operations["stream_query_v1_queries__query_id__stream_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/feedbacks/{query_id}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                query_id: string;
            };
            cookie?: never;
        };
        /** Get feedback for a query */
        get: operations["get_feedback_v1_feedbacks__query_id__get"];
        /** Upsert feedback for a query */
        put: operations["upsert_feedback_v1_feedbacks__query_id__put"];
        post?: never;
        /** Delete feedback for a query */
        delete: operations["delete_feedback_v1_feedbacks__query_id__delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/dashboard/stats": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Dashboard stats (connectors, queries, top usage) */
        get: operations["dashboard_stats_v1_dashboard_stats_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/billing/plan": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List plans (Free/Starter/Pro/Business) */
        get: operations["get_plan_v1_billing_plan_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/billing/usage": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Current usage vs plan limits (daily/weekly/monthly) */
        get: operations["get_usage_v1_billing_usage_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/billing/checkout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create Stripe Checkout session */
        post: operations["checkout_v1_billing_checkout_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/billing/portal": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create Stripe Customer Portal session */
        post: operations["portal_v1_billing_portal_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/billing/webhook": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Stripe webhook (verify HMAC SHA-256) */
        post: operations["webhook_v1_billing_webhook_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/internal/email/test": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Render or send an email template via Resend. Dev-only (404 in production). */
        post: operations["test_internal_email_v1_internal_email_test_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/internal/email/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Return rendered HTML for an email template. Dev-only (404 in production). */
        get: operations["preview_internal_email_v1_internal_email_preview_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        UserResponse: {
            /** Format: uuid */
            id: string;
            /** Format: email */
            email: string;
            name: string;
            locale: string;
            email_verified: boolean;
            /** Format: date-time */
            email_verified_at?: string | null;
            /** Format: date-time */
            created_at: string;
        };
        UserUpdate: {
            locale?: string;
        };
        TokenResponse: {
            access_token: string;
            refresh_token: string;
            /** @enum {string} */
            token_type: "bearer";
        };
        TokenRefresh: {
            refresh_token: string;
        };
        OidcCompleteRequest: {
            state: string;
        };
        OidcCompleteResponse: {
            access_token: string;
            refresh_token: string;
            /** @enum {string} */
            token_type: "bearer";
            user: {
                /** Format: uuid */
                id: string;
                /** Format: email */
                email: string | null;
                name: string | null;
            };
        };
        OidcLogoutResponse: {
            /**
             * Format: uri
             * @description URL para RP-initiated logout. null se o usuário não veio via OIDC.
             */
            end_session_url: string | null;
        };
        ActivePlan: {
            id: string;
            name: string;
            max_queries_daily: number;
            max_queries_weekly: number;
            max_queries_monthly: number;
        } | null;
        UserMeResponse: components["schemas"]["UserResponse"] & {
            active_plan: components["schemas"]["ActivePlan"];
        };
        ApiKeyCreate: {
            name: string;
        };
        ApiKeyResponse: {
            /** Format: uuid */
            id: string;
            name: string;
            prefix: string;
            /** Format: date-time */
            last_used_at: string | null;
            is_active: boolean;
            /** Format: date-time */
            created_at: string;
        };
        ApiKeyCreated: components["schemas"]["ApiKeyResponse"] & {
            /** @description Full key (returned once) */
            key: string;
        };
        ColumnSchema: {
            name: string;
            type: string;
            nullable: boolean;
            /** @default false */
            primary_key: boolean;
            default?: string | null;
            foreign_key?: {
                table?: string;
                column?: string;
            } | null;
        };
        TableSchema: {
            name: string;
            columns: components["schemas"]["ColumnSchema"][];
            rows_approx?: number | null;
        };
        ConnectorCreate: {
            /** @enum {string} */
            type: "mysql" | "mariadb" | "postgresql" | "wp" | "sqlite";
            name: string;
            schema?: components["schemas"]["TableSchema"][];
        };
        ConnectorUpdate: {
            name?: string;
            schema?: components["schemas"]["TableSchema"][];
        };
        ConnectorSyncRequest: {
            schema: components["schemas"]["TableSchema"][];
        };
        ConnectorResponse: {
            /** Format: uuid */
            id: string;
            /** @description "mysql" | "postgresql" | "sqlite" */
            type: string;
            name: string;
            /** Format: date-time */
            last_sync_at: string | null;
            /** Format: date-time */
            created_at: string;
        };
        ConnectorSchemaResponse: {
            tables: components["schemas"]["TableSchema"][];
        };
        SuggestionsResponse: {
            suggestions: string[];
        };
        AutocompleteRequest: {
            question: string;
        };
        QueryRequest: {
            /** Format: uuid */
            connector_id: string;
            question: string;
        };
        LocalResultRequest: {
            result_data: {
                [key: string]: unknown;
            }[];
        };
        QueryResponse: {
            /** Format: uuid */
            id: string;
            question: string;
            sql_generated?: string | null;
            answer?: string | null;
            chart_config?: {
                [key: string]: unknown;
            } | null;
            error?: string | null;
            result_data?: {
                [key: string]: unknown;
            }[] | null;
            needs_local_execution: boolean;
            /** @enum {string} */
            status: "processing" | "ready" | "failed";
            /** Format: date-time */
            created_at: string;
        };
        QueryHistoryItem: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            connector_id: string;
            question: string;
            sql_generated?: string | null;
            answer?: string | null;
            error?: string | null;
            /** @enum {string} */
            status: "processing" | "ready" | "failed";
            /** Format: date-time */
            created_at: string;
        };
        PaginatedQueries: {
            items: components["schemas"]["QueryHistoryItem"][];
            total: number;
            page: number;
            per_page: number;
            total_pages: number;
        };
        FeedbackCreate: {
            positive: boolean;
            comment?: string | null;
        };
        FeedbackResponse: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            query_id: string;
            positive: boolean;
            comment?: string | null;
            /** Format: date-time */
            created_at: string;
            /** Format: date-time */
            updated_at: string;
        };
        DailyQueryCount: {
            /** @description YYYY-MM-DD */
            date: string;
            count: number;
        };
        ConnectorUsage: {
            /** Format: uuid */
            connector_id: string;
            connector_name: string;
            query_count: number;
        };
        DashboardStats: {
            active_connectors: number;
            queries_used_this_month: number;
            queries_limit: number;
            queries_per_day: components["schemas"]["DailyQueryCount"][];
            most_used_connectors: components["schemas"]["ConnectorUsage"][];
            /** Format: date-time */
            fetched_at: string;
        };
        PlanResponse: {
            id: string;
            name: string;
            price: number;
            max_connections: number;
            max_queries_daily: number;
            max_queries_weekly: number;
            max_queries_monthly: number;
        };
        CheckoutResponse: {
            /** Format: uri */
            url: string;
        };
        PortalResponse: {
            /** Format: uri */
            url: string;
        };
        UsageBucket: {
            used: number;
            limit: number;
        };
        UsageResponse: {
            daily: components["schemas"]["UsageBucket"];
            weekly: components["schemas"]["UsageBucket"];
            monthly: components["schemas"]["UsageBucket"];
            plan_id: string;
            plan_name: string;
            /** Format: date-time */
            fetched_at: string;
        };
        HTTPValidationError: {
            detail: {
                loc: string[];
                msg: string;
                type: string;
            }[];
        };
        ErrorResponse: {
            detail: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    health_health_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        status?: string;
                    };
                };
            };
        };
    };
    health_v1_health_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        status?: string;
                    };
                };
            };
        };
    };
    refresh_v1_auth_refresh_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TokenRefresh"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TokenResponse"];
                };
            };
            /** @description Invalid refresh token */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    me_v1_auth_me_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserMeResponse"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    delete_me_v1_auth_me_delete: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Deleted */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    update_me_v1_auth_me_patch: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UserUpdate"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserMeResponse"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Validation error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    logout_v1_auth_logout_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OidcLogoutResponse"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    oidc_start_v1_auth_oidc_start_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Redirect to {issuer}/authorize?... with state, nonce, code_challenge */
            302: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description OIDC not configured */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    oidc_callback_v1_auth_oidc_callback_get: {
        parameters: {
            query: {
                code: string;
                state: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Redirect to {APP_URL}/auth/complete (cookie set in this hop) */
            302: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Invalid/expired state */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    oidc_complete_v1_auth_oidc_complete_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OidcCompleteRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OidcCompleteResponse"];
                };
            };
            /** @description Session cookie missing/expired */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_api_keys_v1_api_keys_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    create_api_key_v1_api_keys_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ApiKeyCreate"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiKeyCreated"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Validation error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    delete_api_key_v1_api_keys__key_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                key_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Revoked */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_connectors_v1_connectors_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    create_connector_v1_connectors_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ConnectorCreate"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConnectorResponse"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Validation error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_connector_v1_connectors__connector_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                connector_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConnectorResponse"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    delete_connector_v1_connectors__connector_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                connector_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Deleted */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    update_connector_v1_connectors__connector_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                connector_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ConnectorUpdate"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConnectorResponse"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Validation error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    sync_connector_v1_connectors__connector_id__sync_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                connector_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ConnectorSyncRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        tables?: Record<string, never>[];
                        /** Format: date-time */
                        last_sync_at?: string;
                    };
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Validation error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_connector_schema_v1_connectors__connector_id__schema_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                connector_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConnectorSchemaResponse"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_suggestions_v1_connectors__connector_id__suggestions_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                connector_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuggestionsResponse"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    autocomplete_v1_connectors__connector_id__autocomplete_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                connector_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AutocompleteRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuggestionsResponse"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Validation error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_queries_v1_queries_get: {
        parameters: {
            query?: {
                page?: number;
                per_page?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedQueries"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Validation error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_query_v1_queries_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["QueryRequest"];
            };
        };
        responses: {
            /** @description OK (SQL generated, needs_local_execution=true) */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QueryResponse"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description API key required — the web app does not ask questions */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Connector not found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Validation error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
            /** @description Rate limit exceeded */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_query_v1_queries__query_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                query_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QueryResponse"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    answer_query_v1_queries__query_id__answer_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                query_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LocalResultRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QueryResponse"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description API key only */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Validation error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    stream_query_v1_queries__query_id__stream_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                query_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description SSE stream */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/event-stream": string;
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_feedback_v1_feedbacks__query_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                query_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FeedbackResponse"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    upsert_feedback_v1_feedbacks__query_id__put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                query_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["FeedbackCreate"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FeedbackResponse"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Query not found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Validation error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    delete_feedback_v1_feedbacks__query_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                query_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Deleted */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    dashboard_stats_v1_dashboard_stats_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DashboardStats"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_plan_v1_billing_plan_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
        };
    };
    get_usage_v1_billing_usage_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UsageResponse"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    checkout_v1_billing_checkout_post: {
        parameters: {
            query: {
                price_id: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CheckoutResponse"];
                };
            };
            /** @description Missing price_id or already has subscription */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    portal_v1_billing_portal_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PortalResponse"];
                };
            };
            /** @description No active subscription */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    webhook_v1_billing_webhook_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": Record<string, never>;
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad signature */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    test_internal_email_v1_internal_email_test_post: {
        parameters: {
            query?: {
                /** @description If '1', returns rendered HTML without calling Resend. */
                preview?: "1";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @enum {string} */
                    template: "verify-account" | "password-reset" | "welcome" | "password-changed";
                    /** Format: email */
                    to: string;
                    name: string;
                    /** @description Optional. Auto-generated if not provided. */
                    token?: string;
                };
            };
        };
        responses: {
            /** @description Email rendered (preview) or sent */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Not found (production only) */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Validation error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    preview_internal_email_v1_internal_email_preview_get: {
        parameters: {
            query: {
                template: "verify-account" | "password-reset" | "welcome" | "password-changed";
                name?: string;
                to?: string;
                token?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Rendered HTML */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Not found (production only) */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Validation error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
}
