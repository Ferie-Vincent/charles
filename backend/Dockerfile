FROM php:8.4-apache

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
        curl \
            libpng-dev \
                libonig-dev \
                    libxml2-dev \
                        zip \
                            unzip \
                                default-mysql-client \
                                    && rm -rf /var/lib/apt/lists/*

                                    # Install PHP extensions
                                    RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd

                                    # Enable Apache mod_rewrite (required for Laravel)
                                    RUN a2enmod rewrite

                                    # Install Composer
                                    COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

                                    # Set working directory
                                    WORKDIR /var/www/html

                                    # Copy application files
                                    COPY . /var/www/html

                                    # Configure Apache to point to Laravel's public directory
                                    RUN sed -i 's|DocumentRoot /var/www/html|DocumentRoot /var/www/html/public|g' /etc/apache2/sites-available/000-default.conf \
                                        && echo '<Directory /var/www/html/public>\n    AllowOverride All\n    Require all granted\n</Directory>' >> /etc/apache2/sites-available/000-default.conf

                                        # Create minimal .env for build-time artisan commands
                                        RUN echo 'APP_KEY=' > .env && echo 'MISTRAL_API_KEY=' >> .env && echo 'GROQ_API_KEY=' >> .env && echo 'ANTHROPIC_API_KEY=' >> .env

                                        # Install dependencies
                                        RUN composer install --no-dev --optimize-autoloader

                                        # Set permissions
                                        RUN chown -R www-data:www-data /var/www/html \
                                            && chmod -R 755 /var/www/html/storage

                                            EXPOSE 80
