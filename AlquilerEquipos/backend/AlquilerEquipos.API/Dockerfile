FROM mcr.microsoft.com/dotnet/sdk:10.0.403 AS build
WORKDIR /src
COPY AlquilerEquipos/backend/ ./backend/
RUN dotnet restore backend/AlquilerEquipos.API/AlquilerEquipos.API.csproj --locked-mode
RUN dotnet publish backend/AlquilerEquipos.API/AlquilerEquipos.API.csproj -c Release --no-restore -o /out /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0.14 AS final
WORKDIR /app
COPY --from=build /out/ ./
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
USER app
ENTRYPOINT ["dotnet", "AlquilerEquipos.API.dll"]
