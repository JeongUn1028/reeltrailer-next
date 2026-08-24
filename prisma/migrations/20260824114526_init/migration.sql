-- CreateTable
CREATE TABLE "Movie" (
    "id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "originalTitle" TEXT,
    "overview" TEXT,
    "posterPath" TEXT,
    "backdropPath" TEXT,
    "releaseDate" TIMESTAMP(3),
    "voteAverage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "popularity" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Genre" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoviesOnGenres" (
    "movieId" INTEGER NOT NULL,
    "genreId" INTEGER NOT NULL,

    CONSTRAINT "MoviesOnGenres_pkey" PRIMARY KEY ("movieId","genreId")
);

-- CreateTable
CREATE TABLE "WatchProvider" (
    "id" INTEGER NOT NULL,
    "providerName" TEXT NOT NULL,
    "logoPath" TEXT,
    "displayPriority" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WatchProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoviesOnWatchProviders" (
    "movieId" INTEGER NOT NULL,
    "providerId" INTEGER NOT NULL,

    CONSTRAINT "MoviesOnWatchProviders_pkey" PRIMARY KEY ("movieId","providerId")
);

-- CreateIndex
CREATE INDEX "Movie_popularity_idx" ON "Movie"("popularity");

-- CreateIndex
CREATE INDEX "Movie_releaseDate_idx" ON "Movie"("releaseDate");

-- AddForeignKey
ALTER TABLE "MoviesOnGenres" ADD CONSTRAINT "MoviesOnGenres_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoviesOnGenres" ADD CONSTRAINT "MoviesOnGenres_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoviesOnWatchProviders" ADD CONSTRAINT "MoviesOnWatchProviders_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoviesOnWatchProviders" ADD CONSTRAINT "MoviesOnWatchProviders_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "WatchProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
