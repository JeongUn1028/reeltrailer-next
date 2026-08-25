-- AlterTable
ALTER TABLE "WatchProvider" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "TvShow" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "originalName" TEXT,
    "overview" TEXT,
    "posterPath" TEXT,
    "backdropPath" TEXT,
    "firstAirDate" TIMESTAMP(3),
    "voteAverage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "popularity" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TvShow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TvShowsOnWatchProviders" (
    "tvShowId" INTEGER NOT NULL,
    "providerId" INTEGER NOT NULL,

    CONSTRAINT "TvShowsOnWatchProviders_pkey" PRIMARY KEY ("tvShowId","providerId")
);

-- CreateIndex
CREATE INDEX "TvShow_popularity_idx" ON "TvShow"("popularity");

-- CreateIndex
CREATE INDEX "TvShow_firstAirDate_idx" ON "TvShow"("firstAirDate");

-- CreateIndex
CREATE INDEX "TvShowsOnWatchProviders_tvShowId_idx" ON "TvShowsOnWatchProviders"("tvShowId");

-- CreateIndex
CREATE INDEX "TvShowsOnWatchProviders_providerId_idx" ON "TvShowsOnWatchProviders"("providerId");

-- CreateIndex
CREATE INDEX "MoviesOnWatchProviders_movieId_idx" ON "MoviesOnWatchProviders"("movieId");

-- CreateIndex
CREATE INDEX "MoviesOnWatchProviders_providerId_idx" ON "MoviesOnWatchProviders"("providerId");

-- AddForeignKey
ALTER TABLE "TvShowsOnWatchProviders" ADD CONSTRAINT "TvShowsOnWatchProviders_tvShowId_fkey" FOREIGN KEY ("tvShowId") REFERENCES "TvShow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TvShowsOnWatchProviders" ADD CONSTRAINT "TvShowsOnWatchProviders_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "WatchProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
