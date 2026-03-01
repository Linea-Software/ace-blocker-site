import { Elysia } from 'elysia';
import { openapi } from '@elysiajs/openapi';
import type { OpenAPIV3 } from 'openapi-types';
import { v1Router } from './routers/v1';
import { auth } from '$lib/server/auth';
import { dev } from '$app/environment';

export const app = new Elysia({ prefix: '/api' })
    .onBeforeHandle(async ({ request }) => {
        // Handle Better Auth endpoints manually if they match /api/auth/*
        const url = new URL(request.url);
        if (url.pathname.startsWith('/api/auth/')) {
            return auth.handler(request);
        }
    })
    .use(v1Router);

if (dev) {
    // Better Auth schema generation is async
    const baSchema = await auth.api.generateOpenAPISchema();

    const baPaths = baSchema.paths || {};
    const prefixedPaths: OpenAPIV3.PathsObject = {};

    for (const [path, pathItem] of Object.entries(baPaths)) {
        if (!pathItem || typeof pathItem !== 'object') continue;

        const transformedPathItem: OpenAPIV3.PathItemObject = { ...(pathItem as OpenAPIV3.PathItemObject) };

        // Ensure parameters satisfy OAS (name is required)
        for (const method of ['get', 'post'] as const) {
            const operation = transformedPathItem[method];
            if (operation && typeof operation === 'object' && 'parameters' in operation) {
                const parameters = operation.parameters;
                if (Array.isArray(parameters)) {
                    operation.parameters = parameters.map((p: unknown) => {
                        if (p && typeof p === 'object') {
                            const paramObj = p as Record<string, unknown>;
                            return {
                                ...paramObj,
                                name: typeof paramObj.name === 'string' ? paramObj.name : 'parameter'
                            } as OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject;
                        }
                        return p as OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject;
                    });
                }
            }
        }

        prefixedPaths[`/auth${path}`] = transformedPathItem;
    }

    const baSchemas = baSchema.components?.schemas || {};
    const transformedSchemas: Record<string, OpenAPIV3.SchemaObject> = {};

    for (const [name, schemaInfo] of Object.entries(baSchemas)) {
        if (!schemaInfo || typeof schemaInfo !== 'object') continue;
        const schema = schemaInfo as Record<string, unknown>;

        const properties: Record<string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject> = {};
        const originalProperties = schema.properties;

        if (originalProperties && typeof originalProperties === 'object') {
            for (const [propName, propValue] of Object.entries(originalProperties)) {
                if (propValue && typeof propValue === 'object') {
                    const prop = { ...propValue } as Record<string, unknown>;
                    let type = typeof prop.type === 'string' ? prop.type : undefined;
                    let format = typeof prop.format === 'string' ? prop.format : undefined;

                    // OAS compatible type mapping
                    if (type === 'json') type = 'object';
                    if (type === 'date') {
                        type = 'string';
                        format = 'date-time';
                    }

                    prop.type = type;
                    if (format) prop.format = format;

                    properties[propName] = prop as OpenAPIV3.SchemaObject;
                }
            }
        }

        transformedSchemas[name] = {
            ...schema,
            properties
        } as OpenAPIV3.SchemaObject;
    }

    const baComponents = baSchema.components as Record<string, unknown> | undefined;
    const baSecuritySchemes = baComponents?.securitySchemes as Record<string, Record<string, unknown>> | undefined;

    const apiKeyCookieIn = baSecuritySchemes?.apiKeyCookie?.in;
    const apiKeyCookieName = baSecuritySchemes?.apiKeyCookie?.name;

    app.use(
        openapi({
            path: '/docs',
            specPath: '/v1/openapi.json',
            documentation: {
                openapi: '3.1.0',
                info: {
                    title: 'Ace Blocker API',
                    version: '1.0.0'
                },
                paths: prefixedPaths,
                components: {
                    ...baComponents,
                    schemas: transformedSchemas,
                    securitySchemes: {
                        apiKeyCookie: {
                            type: 'apiKey',
                            in: typeof apiKeyCookieIn === 'string' ? apiKeyCookieIn : 'cookie',
                            name: typeof apiKeyCookieName === 'string' ? apiKeyCookieName : 'better-auth.session-token'
                        },
                        APIKeyHeader: {
                            type: 'apiKey',
                            in: 'header',
                            name: 'x-api-key'
                        }
                    }
                }
            }
        })
    );
}

export type AppType = typeof app;
