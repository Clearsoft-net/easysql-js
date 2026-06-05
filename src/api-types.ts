export interface paths {
    "/v1/api-keys": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Api Keys */
        get: operations["list_api_keys_v1_api_keys_get"];
        put?: never;
        /**
         * Create Api Key
         * @description Create a new API key. The full key is returned only once in this response.
         */
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
        /** Delete Api Key */
        delete: operations["delete_api_key_v1_api_keys__key_id__delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/register": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Register */
        post: operations["register_v1_auth_register_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Login */
        post: operations["login_v1_auth_login_post"];
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
        /** Refresh */
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
        /** Me */
        get: operations["me_v1_auth_me_get"];
        put?: never;
        post?: never;
        /** Delete Me */
        delete: operations["delete_me_v1_auth_me_delete"];
        options?: never;
        head?: never;
        /** Update Me */
        patch: operations["update_me_v1_auth_me_patch"];
        trace?: never;
    };
    "/v1/auth/change-password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Change Password */
        post: operations["change_password_v1_auth_change_password_post"];
        delete?: never;
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
        /** List Connectors */
        get: operations["list_connectors_v1_connectors_get"];
        put?: never;
        /** Create Connector */
        post: operations["create_connector_v1_connectors_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/connectors/test": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Test Connector
         * @description Test a database connection without creating a connector.
         */
        post: operations["test_connector_v1_connectors_test_post"];
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
            path?: never;
            cookie?: never;
        };
        /** Get Connector */
        get: operations["get_connector_v1_connectors__connector_id__get"];
        put?: never;
        post?: never;
        /** Delete Connector */
        delete: operations["delete_connector_v1_connectors__connector_id__delete"];
        options?: never;
        head?: never;
        /** Update Connector */
        patch: operations["update_connector_v1_connectors__connector_id__patch"];
        trace?: never;
    };
    "/v1/connectors/{connector_id}/sync": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Sync Connector */
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
            path?: never;
            cookie?: never;
        };
        /**
         * Get Connector Schema
         * @description Return the cached schema (tables, columns, types, primary/foreign keys) for a connector.
         *
         *     Requires the connector to have been synced first via POST /v1/connectors/{id}/sync.
         */
        get: operations["get_connector_schema_v1_connectors__connector_id__schema_get"];
        put?: never;
        post?: never;
        delete?: never;
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
        /** Dashboard Stats */
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
        /** Get Plan */
        get: operations["get_plan_v1_billing_plan_get"];
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
        /** Checkout */
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
        /** Portal */
        post: operations["portal_v1_billing_portal_post"];
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
        /** List Queries */
        get: operations["list_queries_v1_queries_get"];
        put?: never;
        /** Create Query */
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
            path?: never;
            cookie?: never;
        };
        /** Get Query */
        get: operations["get_query_v1_queries__query_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Health */
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
        /** Health V1 */
        get: operations["health_v1_v1_health_get"];
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
        /** ApiKeyCreate */
        ApiKeyCreate: {
            /** Name */
            name: string;
        };
        /**
         * ApiKeyCreated
         * @description Returned when a key is created — includes the full key once.
         */
        ApiKeyCreated: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Name */
            name: string;
            /** Prefix */
            prefix: string;
            /** Key */
            key: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** ApiKeyResponse */
        ApiKeyResponse: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Name */
            name: string;
            /** Prefix */
            prefix: string;
            /** Last Used At */
            last_used_at: string | null;
            /** Is Active */
            is_active: boolean;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** ChangePasswordRequest */
        ChangePasswordRequest: {
            /** Current Password */
            current_password: string;
            /** New Password */
            new_password: string;
        };
        /** CheckoutResponse */
        CheckoutResponse: {
            /** Url */
            url: string;
        };
        /** ColumnSchema */
        ColumnSchema: {
            /** Name */
            name: string;
            /** Type */
            type: string;
            /**
             * Nullable
             * @default true
             */
            nullable: boolean;
            /**
             * Primary Key
             * @default false
             */
            primary_key: boolean;
            /** Default */
            default?: string | null;
            foreign_key?: components["schemas"]["ForeignKeySchema"] | null;
        };
        /** ConnectorConfig */
        ConnectorConfig: {
            /** Host */
            host: string;
            /** Port */
            port: number;
            /** User */
            user: string;
            /** Password */
            password: string;
            /** Database */
            database: string;
            /**
             * Ssl
             * @default true
             */
            ssl: boolean;
        };
        /** ConnectorCreate */
        ConnectorCreate: {
            /** Type */
            type: string;
            /** Name */
            name: string;
            config: components["schemas"]["ConnectorConfig"];
        };
        /** ConnectorResponse */
        ConnectorResponse: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Type */
            type: string;
            /** Name */
            name: string;
            /** Last Sync At */
            last_sync_at: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** ConnectorSchemaResponse */
        ConnectorSchemaResponse: {
            /** Tables */
            tables: components["schemas"]["TableSchema"][];
        };
        /** ConnectorTestRequest */
        ConnectorTestRequest: {
            /** Type */
            type: string;
            config: components["schemas"]["ConnectorConfig"];
        };
        /** ConnectorTestResponse */
        ConnectorTestResponse: {
            /**
             * Success
             * @default true
             */
            success: boolean;
            /**
             * Message
             * @default Connection successful
             */
            message: string;
        };
        /** ConnectorUpdate */
        ConnectorUpdate: {
            /** Name */
            name?: string | null;
            config?: components["schemas"]["ConnectorConfig"] | null;
        };
        /** ConnectorUsage */
        ConnectorUsage: {
            /**
             * Connector Id
             * Format: uuid
             */
            connector_id: string;
            /** Connector Name */
            connector_name: string;
            /** Query Count */
            query_count: number;
        };
        /** DailyQueryCount */
        DailyQueryCount: {
            /**
             * Date
             * Format: date
             */
            date: string;
            /** Count */
            count: number;
        };
        /** DashboardStats */
        DashboardStats: {
            /** Active Connectors */
            active_connectors: number;
            /** Queries Used This Month */
            queries_used_this_month: number;
            /** Queries Limit */
            queries_limit: number;
            /** Queries Per Day */
            queries_per_day: components["schemas"]["DailyQueryCount"][];
            /** Most Used Connectors */
            most_used_connectors: components["schemas"]["ConnectorUsage"][];
            /**
             * Fetched At
             * Format: date-time
             */
            fetched_at: string;
        };
        /** ForeignKeySchema */
        ForeignKeySchema: {
            /** Table */
            table: string;
            /** Column */
            column: string;
        };
        /** HTTPValidationError */
        HTTPValidationError: {
            /** Detail */
            detail?: components["schemas"]["ValidationError"][];
        };
        /** PaginatedQueries */
        PaginatedQueries: {
            /** Items */
            items: components["schemas"]["QueryHistoryItem"][];
            /** Total */
            total: number;
            /** Page */
            page: number;
            /** Per Page */
            per_page: number;
            /** Total Pages */
            total_pages: number;
        };
        /** PlanResponse */
        PlanResponse: {
            /** Id */
            id: string;
            /** Name */
            name: string;
            /** Price */
            price: number;
            /** Max Connections */
            max_connections: number;
            /** Max Queries Monthly */
            max_queries_monthly: number;
            /**
             * Is Active
             * @default false
             */
            is_active: boolean;
        };
        /** PortalResponse */
        PortalResponse: {
            /** Url */
            url: string;
        };
        /** QueryHistoryItem */
        QueryHistoryItem: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Connector Id
             * Format: uuid
             */
            connector_id: string;
            /** Question */
            question: string;
            /** Sql Generated */
            sql_generated: string | null;
            /** Answer */
            answer: string | null;
            /** Error */
            error: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** QueryRequest */
        QueryRequest: {
            /**
             * Connector Id
             * Format: uuid
             */
            connector_id: string;
            /** Question */
            question: string;
        };
        /** QueryResponse */
        QueryResponse: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Question */
            question: string;
            /** Sql Generated */
            sql_generated: string | null;
            /** Answer */
            answer: string | null;
            /** Chart Config */
            chart_config: {
                [key: string]: unknown;
            } | null;
            /** Error */
            error: string | null;
            /** Result Data */
            result_data?: {
                [key: string]: unknown;
            }[] | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** TableSchema */
        TableSchema: {
            /** Name */
            name: string;
            /** Columns */
            columns: components["schemas"]["ColumnSchema"][];
            /** Rows Approx */
            rows_approx?: number | null;
        };
        /** TokenRefresh */
        TokenRefresh: {
            /** Refresh Token */
            refresh_token: string;
        };
        /** TokenResponse */
        TokenResponse: {
            /** Access Token */
            access_token: string;
            /** Refresh Token */
            refresh_token: string;
            /**
             * Token Type
             * @default bearer
             */
            token_type: string;
        };
        /** UserCreate */
        UserCreate: {
            /**
             * Email
             * Format: email
             */
            email: string;
            /** Password */
            password: string;
            /** Name */
            name: string;
        };
        /** UserLogin */
        UserLogin: {
            /**
             * Email
             * Format: email
             */
            email: string;
            /** Password */
            password: string;
        };
        /** UserResponse */
        UserResponse: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Email */
            email: string;
            /** Name */
            name: string;
            /** Locale */
            locale: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** UserUpdate */
        UserUpdate: {
            /** Name */
            name?: string | null;
            /** Locale */
            locale?: string | null;
        };
        /** ValidationError */
        ValidationError: {
            /** Location */
            loc: (string | number)[];
            /** Message */
            msg: string;
            /** Error Type */
            type: string;
            /** Input */
            input?: unknown;
            /** Context */
            ctx?: Record<string, never>;
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
    list_api_keys_v1_api_keys_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiKeyResponse"][];
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
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiKeyCreated"];
                };
            };
            /** @description Validation Error */
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
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Validation Error */
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
    register_v1_auth_register_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UserCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserResponse"];
                };
            };
            /** @description Validation Error */
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
    login_v1_auth_login_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UserLogin"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TokenResponse"];
                };
            };
            /** @description Validation Error */
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
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TokenResponse"];
                };
            };
            /** @description Validation Error */
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
    me_v1_auth_me_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserResponse"];
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
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
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
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserResponse"];
                };
            };
            /** @description Validation Error */
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
    change_password_v1_auth_change_password_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ChangePasswordRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
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
    list_connectors_v1_connectors_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConnectorResponse"][];
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
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConnectorResponse"];
                };
            };
            /** @description Validation Error */
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
    test_connector_v1_connectors_test_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ConnectorTestRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConnectorTestResponse"];
                };
            };
            /** @description Validation Error */
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
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConnectorResponse"];
                };
            };
            /** @description Validation Error */
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
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Validation Error */
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
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConnectorResponse"];
                };
            };
            /** @description Validation Error */
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
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
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
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConnectorSchemaResponse"];
                };
            };
            /** @description Validation Error */
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
    dashboard_stats_v1_dashboard_stats_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DashboardStats"];
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
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PlanResponse"][];
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
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CheckoutResponse"];
                };
            };
            /** @description Validation Error */
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
    portal_v1_billing_portal_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PortalResponse"];
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
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedQueries"];
                };
            };
            /** @description Validation Error */
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
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QueryResponse"];
                };
            };
            /** @description Validation Error */
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
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QueryResponse"];
                };
            };
            /** @description Validation Error */
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
    health_health_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
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
    health_v1_v1_health_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
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
}
