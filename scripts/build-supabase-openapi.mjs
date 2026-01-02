#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const cataloguePath = path.join(repoRoot, 'supabase', 'rpc-catalogue.json');

const catalogue = JSON.parse(readFileSync(cataloguePath, 'utf8'));

function toJsonSchema(definition) {
  if (!definition) {
    return { type: 'object' };
  }
  const type = definition.type;
  if (type === 'object') {
    const properties = definition.properties ?? {};
    const required = Object.entries(properties)
      .filter(([, value]) => value && value.required)
      .map(([key]) => key);
    const normalizedProps = {};
    for (const [key, value] of Object.entries(properties)) {
      const { required: _req, ...rest } = value;
      normalizedProps[key] = rest;
    }
    const schema = { type: 'object', properties: normalizedProps };
    if (required.length > 0) {
      schema.required = required;
    }
    return schema;
  }
  if (type === 'array') {
    return { type: 'array', items: toJsonSchema(definition.items) };
  }
  if (['string', 'number', 'integer', 'boolean'].includes(type)) {
    const { description, format, enum: enumeration } = definition;
    const schema = { type };
    if (description) schema.description = description;
    if (format) schema.format = format;
    if (enumeration) schema.enum = enumeration;
    return schema;
  }
  return { type: 'object' };
}

function paramTypeToDart(type) {
  switch (type) {
    case 'string':
      return 'String';
    case 'number':
      return 'double';
    case 'integer':
      return 'int';
    case 'boolean':
      return 'bool';
    case 'array':
      return 'List<dynamic>';
    case 'object':
    default:
      return 'Map<String, dynamic>';
  }
}

function toCamel(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

const openapi = {
  openapi: '3.1.0',
  info: {
    title: 'Talabat Supabase RPC – Phase 0 Catalogue',
    version: '1.0.0',
    description: 'Auto-generated from supabase/rpc-catalogue.json. Used by Flutter repositories and contract tests.',
  },
  paths: {},
  components: {},
};

const dartMethods = [];

for (const rpc of catalogue) {
  const pathKey = `/rpc/${rpc.name}`;
  const requestSchema = { type: 'object', properties: {} };
  const required = [];
  if (Array.isArray(rpc.params) && rpc.params.length > 0) {
    for (const param of rpc.params) {
      requestSchema.properties[param.name] = {
        type: param.type,
        description: param.description,
      };
      if (param.required) required.push(param.name);
    }
    if (required.length > 0) requestSchema.required = required;
  }

  const responseSchema = toJsonSchema(rpc.response);

  openapi.paths[pathKey] = {
    post: {
      summary: rpc.summary,
      tags: rpc.tags ?? [],
      operationId: rpc.name,
      requestBody:
        (rpc.params?.length ?? 0) > 0
          ? {
              required: true,
              content: {
                'application/json': {
                  schema: requestSchema,
                },
              },
            }
          : undefined,
      responses: {
        200: {
          description: rpc.response?.description ?? 'RPC response',
          content: {
            'application/json': {
              schema: responseSchema,
            },
          },
        },
      },
    },
  };

  const paramsDecl = (rpc.params ?? []).map((param) => {
    const dartName = toCamel(param.name);
    const dartType = paramTypeToDart(param.type);
    const prefix = param.required ? 'required ' : '';
    const nullable = param.required ? '' : '?';
    return `${prefix}${dartType}${nullable} ${dartName}`;
  });

  const hasParams = paramsDecl.length > 0;
  const argsObject = (rpc.params ?? [])
    .map((param) => {
      const dartName = toCamel(param.name);
      return `'${param.name}': ${dartName}`;
    })
    .join(', ');

  const method = `
  Future<dynamic> ${toCamel(rpc.name)}(${hasParams ? `{${paramsDecl.join(', ')}}` : ''}) {
    return _client.rpc(
      '${rpc.name}'${argsObject ? `,\n      params: {${argsObject}},` : ''}
    );
  }`;

  dartMethods.push(method);
}

const openapiDir = path.join(repoRoot, 'supabase', 'openapi');
mkdirSync(openapiDir, { recursive: true });
const openapiPath = path.join(openapiDir, 'phase0-openapi.json');
writeFileSync(openapiPath, `${JSON.stringify(openapi, null, 2)}\n`);

const generatedDir = path.join(repoRoot, 'flutter', 'packages', 'app_services', 'lib', 'src', 'generated');
mkdirSync(generatedDir, { recursive: true });
const dartFile = `// GENERATED CODE - DO NOT MODIFY BY HAND.

import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseRpcRepository {
  const SupabaseRpcRepository(this._client);

  final SupabaseClient _client;
${dartMethods.join('\n')}
}
`;

writeFileSync(path.join(generatedDir, 'supabase_rpc_repository.dart'), dartFile);

console.log('Generated OpenAPI spec and Supabase RPC repository bindings.');
