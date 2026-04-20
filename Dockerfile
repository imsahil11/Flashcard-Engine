FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

FROM base AS deps
COPY package.json package-lock.json* turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/utils/package.json packages/utils/package.json
RUN npm install

FROM deps AS builder
COPY . .
RUN npm run db:generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ARG APP=@flashcard/api
ENV APP=${APP}
COPY --from=builder /app /app
EXPOSE 3000 4000
CMD npm --workspace "$APP" run start
