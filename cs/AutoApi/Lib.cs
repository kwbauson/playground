using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Reflection.Emit;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.ApplicationModels;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.Extensions.DependencyInjection;

namespace AutoApi
{
    public static class AutoApiExtensions
    {
        public static IServiceCollection AddAutoApi<T>(this IServiceCollection services) => services.AddAutoApi(typeof(T));

        public static IServiceCollection AddAutoApi(this IServiceCollection services, Type rootType)
        {
            var apiTypeProvider = new ApiTypeProvider(rootType);

            services.AddSingleton<AutoApiControllerFeatureProvider>();
            foreach (var type in apiTypeProvider.ControllerTypes)
            {
                var serviceType = typeof(ICrudlRepository<,>).MakeGenericType(type, typeof(Guid));
                var implementationType = typeof(DictionaryCrudlRepository<>).MakeGenericType(type);
                services.AddSingleton(serviceType, implementationType);
            }
            services.AddMvc(options =>
            {
                options.Conventions.Add(new AutoApiControllerRouteConvention());
            }).ConfigureApplicationPartManager(apm =>
            {
                var feature = new AutoApiControllerFeatureProvider(apiTypeProvider);
                apm.FeatureProviders.Add(feature);
            });
            return services;
        }

        public static IApplicationBuilder UseAutoApi(this IApplicationBuilder app)
        {
            using (var scope = app.ApplicationServices.CreateScope())
            {
            }
            app.UseMvc();
            return app;
        }
    }

    public interface IApiTypeProvider
    {
        Type RootType { get; }
        IEnumerable<Type> ControllerTypes { get; }
    }

    public class ApiTypeProvider : IApiTypeProvider
    {
        public Type RootType { get; }

        public IEnumerable<Type> ControllerTypes => RootType
            .GetProperties()
            .Select(x => x.PropertyType)
            .Where(x => x.IsGenericType && x.GetGenericTypeDefinition() == typeof(IEnumerable<>))
            .SelectMany(x => x.GenericTypeArguments);

        public ApiTypeProvider(Type rootType)
        {
            RootType = rootType;
        }
    }

    public class AutoApiControllerFeatureProvider : IApplicationFeatureProvider<ControllerFeature>
    {
        private readonly IApiTypeProvider _apiTypeProvider;

        public AutoApiControllerFeatureProvider(IApiTypeProvider apiTypeProvider)
        {
            _apiTypeProvider = apiTypeProvider;
        }

        public void PopulateFeature(IEnumerable<ApplicationPart> parts, ControllerFeature feature)
        {
            foreach (var entityType in _apiTypeProvider.ControllerTypes)
            {
                var idType = typeof(Guid);
                feature.Controllers.Add(GetControllerTypeInfoForType(entityType, idType));
            }
        }

        public TypeInfo GetControllerTypeInfoForType(Type entityType, Type idType)
        {
            return typeof(GenericCrudlController<,>).MakeGenericType(entityType, idType).GetTypeInfo();
        }
    }

    public class AutoApiControllerRouteConvention : IControllerModelConvention
    {
        public void Apply(ControllerModel controller)
        {
            if (controller.ControllerType.GetGenericTypeDefinition() == typeof(GenericCrudlController<,>))
            {
                var type = controller.ControllerType.GenericTypeArguments[0];
                controller.ControllerName = $"{type.Name}Controller";
                controller.Selectors.Clear();
                controller.Selectors.Add(new SelectorModel
                {
                    AttributeRouteModel = new AttributeRouteModel(new RouteAttribute($"api/{type.Name}")),
                });
            }
        }
    }

    [ApiExplorerSettings]
    public class GenericCrudlController<T, TId>
    {
        private readonly ICrudlRepository<T, TId> _repository;

        public GenericCrudlController(ICrudlRepository<T, TId> repository)
        {
            _repository = repository;
        }

        [HttpPost]
        public ActionResult<TId> Create([FromBody] T entity)
        {
            return _repository.Create(entity);
        }

        [HttpGet("{id}")]
        public ActionResult<T> Read(TId id)
        {
            return _repository.Read(id);
        }

        [HttpPut("{id}")]
        public ActionResult Update(TId id, [FromBody] T entity)
        {
            _repository.Update(id, entity);
            return new OkResult();
        }

        [HttpDelete("{id}")]
        public ActionResult Delete(TId id)
        {
            _repository.Delete(id);
            return new OkResult();
        }

        [HttpGet]
        public ActionResult<IEnumerable<T>> List()
        {
            return new OkObjectResult(_repository.List());
        }
    }

    public class DictionaryCrudlRepository<T> : ICrudlRepository<T, Guid>
    {
        IDictionary<Guid, T> _storage = new Dictionary<Guid, T>();

        public Guid Create(T entity)
        {
            var id = Guid.NewGuid();
            _storage[id] = entity;
            return id;
        }

        public T Read(Guid id)
        {
            return _storage[id];
        }

        public void Update(Guid id, T entity)
        {
            _storage[id] = entity;
        }

        public void Delete(Guid id)
        {
            _storage.Remove(id);
        }

        public IEnumerable<T> List()
        {
            return _storage.Values;
        }
    }

    public interface ICrudlRepository<T, TId>
        : ICreateRepository<T, TId>
        , IReadRepository<T, TId>
        , IUpdateRepository<T, TId>
        , IDeleteRepository<T, TId>
        , IListRepository<T>
    {
    }

    public interface ICreateRepository<T, TId>
    {
        TId Create(T entity);
    }

    public interface IReadRepository<T, TId>
    {
        T Read(TId id);
    }

    public interface IUpdateRepository<T, TId>
    {
        void Update(TId id, T entity);
    }

    public interface IDeleteRepository<T, TId>
    {
        void Delete(TId id);
    }

    public interface IListRepository<T>
    {
        IEnumerable<T> List();
    }
}