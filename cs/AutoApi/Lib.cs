using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

namespace AutoApi
{
    public static class AutoApiExtensions
    {
        public static IServiceCollection AddAutoApi<T>(this IServiceCollection services)
        {
            return services;
        }

        public static IApplicationBuilder UseAutoApi(this IApplicationBuilder app)
        {
            return app;
        }
    }
}