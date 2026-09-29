.PHONY: all install dev build start test test-unit test-e2e test-all test-live lint docker-build docker-up clean

all: install build test-all

install:
	npm install

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

lint:
	npm run lint

test:
	npm run test

test-unit:
	npm run test

test-e2e:
	npx playwright test

test-all:
	npm run test:all

test-live:
	npm run test:live

docker-build:
	docker compose build

docker-up:
	docker compose up -d

clean:
	rm -rf .next coverage test-results playwright-report
